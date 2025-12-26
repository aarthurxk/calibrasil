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
    const respond = (success: boolean, reason?: string) => {
      if (isGetRequest) {
        const redirectUrl = success 
          ? `${frontendUrl}/meus-pedidos?confirmado=1`
          : `${frontendUrl}/meus-pedidos?confirmado=0&motivo=${encodeURIComponent(reason || 'erro')}`;
        
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
        if (success) {
          return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ error: reason, success: false }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    };

    // Validate parameters
    if (!orderId) {
      console.error('[CONFIRM-RECEIVED] Missing orderId');
      return respond(false, 'pedido_nao_especificado');
    }

    if (!token) {
      console.error('[CONFIRM-RECEIVED] Missing token');
      return respond(false, 'token_ausente');
    }

    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, received_at')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error('[CONFIRM-RECEIVED] Order not found:', orderError);
      return respond(false, 'pedido_nao_encontrado');
    }

    // Validate and use the token via database function
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_order_confirm_token', {
        p_order_id: orderId,
        p_token: token
      });

    if (validationError) {
      console.error('[CONFIRM-RECEIVED] Validation error:', validationError);
      return respond(false, 'erro_validacao');
    }

    // Handle validation result
    if (!validationResult?.valid) {
      const errorReasons: Record<string, string> = {
        'token_not_found': 'token_nao_encontrado',
        'token_already_used': 'ja_confirmado',
        'token_expired': 'token_expirado',
        'token_invalid': 'token_invalido'
      };
      
      const reason = errorReasons[validationResult?.error] || 'erro_desconhecido';
      console.error(`[CONFIRM-RECEIVED] Token validation failed: ${validationResult?.error}`);
      
      // Special case: already used - still redirect to success page since it was confirmed before
      if (validationResult?.error === 'token_already_used') {
        console.log(`[CONFIRM-RECEIVED] Order ${orderId} was already confirmed`);
        if (isGetRequest) {
          return new Response(null, {
            status: 302,
            headers: {
              ...corsHeaders,
              'Location': `${frontendUrl}/meus-pedidos?confirmado=1&ja_confirmado=1`
            }
          });
        }
        return new Response(
          JSON.stringify({ alreadyConfirmed: true, success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return respond(false, reason);
    }

    console.log(`[CONFIRM-RECEIVED] Order ${orderId} marked as delivered successfully`);
    return respond(true);

  } catch (error: any) {
    console.error("[CONFIRM-RECEIVED] Unexpected error:", error);
    
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://calibrasil.com';
    
    if (req.method === "GET") {
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${frontendUrl}/meus-pedidos?confirmado=0&motivo=erro_inesperado`
        }
      });
    }
    
    return new Response(
      JSON.stringify({ error: 'Ocorreu um erro inesperado.' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
