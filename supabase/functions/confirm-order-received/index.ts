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

  try {
    // Handle POST request from frontend
    if (req.method === "POST") {
      const { orderId, token } = await req.json();
      
      console.log(`[CONFIRM-RECEIVED] Processing order: ${orderId}`);

      if (!orderId || !token) {
        return new Response(
          JSON.stringify({ error: 'Link inválido. Parâmetros faltando.' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate token format (simple hash of orderId)
      const expectedToken = await generateToken(orderId);
      if (token !== expectedToken) {
        console.error('[CONFIRM-RECEIVED] Invalid token');
        return new Response(
          JSON.stringify({ error: 'Link inválido ou expirado.' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Check if order exists and is in shipped status
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, status, received_at')
        .eq('id', orderId)
        .single();

      if (fetchError || !order) {
        console.error('[CONFIRM-RECEIVED] Order not found:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Pedido não encontrado.' }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already confirmed
      if (order.received_at) {
        return new Response(
          JSON.stringify({ alreadyConfirmed: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update order status to delivered and set received_at
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'delivered',
          received_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('[CONFIRM-RECEIVED] Error updating order:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erro ao confirmar recebimento. Tente novamente.' }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[CONFIRM-RECEIVED] Order ${orderId} marked as delivered`);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle GET request from email link - redirect to frontend
    const url = new URL(req.url);
    const orderId = url.searchParams.get('orderId');
    const token = url.searchParams.get('token');
    
    // Get the frontend URL from environment or use default
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://calibrasil.com';
    
    // Redirect to frontend page with parameters
    const redirectUrl = `${frontendUrl}/order-received?orderId=${orderId}&token=${token}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    });

  } catch (error: any) {
    console.error("[CONFIRM-RECEIVED] Error:", error);
    return new Response(
      JSON.stringify({ error: 'Ocorreu um erro inesperado. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateToken(orderId: string): Promise<string> {
  const secret = Deno.env.get('INTERNAL_API_SECRET');
  if (!secret) {
    throw new Error('INTERNAL_API_SECRET not configured');
  }
  const data = new TextEncoder().encode(orderId + secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}