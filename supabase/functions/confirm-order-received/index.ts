import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://calibrasil.com';
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let orderId: string | null = null;
    let token: string | null = null;
    const isGetRequest = req.method === "GET";

    // Handle both GET (from email link) and POST (from frontend)
    if (isGetRequest) {
      const url = new URL(req.url);
      orderId = url.searchParams.get('orderId');
      token = url.searchParams.get('token');
    } else if (req.method === "POST") {
      const body = await req.json();
      orderId = body.orderId;
      token = body.token;
    }

    console.log(`[CONFIRM-RECEIVED] Processing order: ${orderId}, method: ${req.method}`);

    // Helper function for 302 redirect (GET) or JSON response (POST)
    const respond = (status: 'ok' | 'already' | 'error', reason?: string) => {
      if (isGetRequest) {
        let redirectUrl: string;
        if (status === 'ok') {
          redirectUrl = `${frontendUrl}/confirmacao-recebimento?status=ok`;
        } else if (status === 'already') {
          redirectUrl = `${frontendUrl}/confirmacao-recebimento?status=already`;
        } else {
          redirectUrl = `${frontendUrl}/confirmacao-recebimento?status=error&reason=${encodeURIComponent(reason || 'unknown')}`;
        }
        
        console.log(`[CONFIRM-RECEIVED] Redirecting to: ${redirectUrl}`);
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': redirectUrl
          }
        });
      } else {
        // POST request - return JSON
        const success = status === 'ok' || status === 'already';
        return new Response(
          JSON.stringify({ 
            success, 
            status,
            ...(reason && { reason }),
            ...(status === 'already' && { alreadyConfirmed: true })
          }),
          { 
            status: success ? 200 : 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    };

    // Validate parameters
    if (!orderId) {
      console.error('[CONFIRM-RECEIVED] Missing orderId');
      return respond('error', 'order');
    }

    if (!token) {
      console.error('[CONFIRM-RECEIVED] Missing token');
      return respond('error', 'token');
    }

    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, received_at')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error('[CONFIRM-RECEIVED] Order not found:', orderError);
      return respond('error', 'order');
    }

    // Idempotency: if already confirmed, return success
    if (order.status === 'delivered' && order.received_at) {
      console.log(`[CONFIRM-RECEIVED] Order ${orderId} already confirmed at ${order.received_at}`);
      return respond('already');
    }

    // Validate and use the token via database function
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_order_confirm_token', {
        p_order_id: orderId,
        p_token: token
      });

    if (validationError) {
      console.error('[CONFIRM-RECEIVED] Validation error:', validationError);
      return respond('error', 'token');
    }

    // Handle validation result
    if (!validationResult?.valid) {
      const validationErr = validationResult?.error;
      console.error(`[CONFIRM-RECEIVED] Token validation failed: ${validationErr}`);
      
      // Special case: already used - redirect to already confirmed
      if (validationErr === 'token_already_used') {
        console.log(`[CONFIRM-RECEIVED] Order ${orderId} was already confirmed via token`);
        return respond('already');
      }

      return respond('error', 'token');
    }

    console.log(`[CONFIRM-RECEIVED] Order ${orderId} marked as delivered successfully`);
    return respond('ok');

  } catch (error: any) {
    console.error("[CONFIRM-RECEIVED] Unexpected error:", error);
    
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://calibrasil.com';
    
    if (req.method === "GET") {
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${frontendUrl}/confirmacao-recebimento?status=error&reason=unexpected`
        }
      });
    }
    
    return new Response(
      JSON.stringify({ error: 'Ocorreu um erro inesperado.', success: false, status: 'error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
