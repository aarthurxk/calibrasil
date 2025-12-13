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
    const url = new URL(req.url);
    const orderId = url.searchParams.get('orderId');
    const token = url.searchParams.get('token');

    console.log(`[CONFIRM-RECEIVED] Processing order: ${orderId}`);

    if (!orderId || !token) {
      return new Response(
        generateHtmlPage('Erro', 'Link inválido. Parâmetros faltando.', 'error'),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Validate token format (simple hash of orderId)
    const expectedToken = await generateToken(orderId);
    if (token !== expectedToken) {
      console.error('[CONFIRM-RECEIVED] Invalid token');
      return new Response(
        generateHtmlPage('Erro', 'Link inválido ou expirado.', 'error'),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
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
        generateHtmlPage('Erro', 'Pedido não encontrado.', 'error'),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Check if already confirmed
    if (order.received_at) {
      return new Response(
        generateHtmlPage('Já Confirmado', 'Você já confirmou o recebimento deste pedido anteriormente. Obrigado!', 'info'),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
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
        generateHtmlPage('Erro', 'Erro ao confirmar recebimento. Tente novamente.', 'error'),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    console.log(`[CONFIRM-RECEIVED] Order ${orderId} marked as delivered`);

    return new Response(
      generateHtmlPage(
        'Recebimento Confirmado! ✅', 
        'Obrigado por confirmar o recebimento do seu pedido! Esperamos que você ame seus produtos Cali. Que tal deixar uma avaliação?',
        'success',
        orderId
      ),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );

  } catch (error: any) {
    console.error("[CONFIRM-RECEIVED] Error:", error);
    return new Response(
      generateHtmlPage('Erro', 'Ocorreu um erro inesperado. Tente novamente.', 'error'),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  }
});

async function generateToken(orderId: string): Promise<string> {
  const secret = Deno.env.get('INTERNAL_API_SECRET') || 'default-secret';
  const data = new TextEncoder().encode(orderId + secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateHtmlPage(title: string, message: string, type: 'success' | 'error' | 'info', orderId?: string): string {
  const colors = {
    success: { bg: '#dcfce7', border: '#16a34a', text: '#166534', icon: '✅' },
    error: { bg: '#fee2e2', border: '#dc2626', text: '#991b1b', icon: '❌' },
    info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', icon: 'ℹ️' },
  };
  
  const color = colors[type];
  const siteUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') || 'https://calibrasil.com';
  const storeUrl = 'https://calibrasil.com';

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Cali Brasil</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          padding: 40px;
          max-width: 480px;
          text-align: center;
        }
        .icon { font-size: 48px; margin-bottom: 20px; }
        h1 { color: ${color.text}; margin-bottom: 16px; font-size: 24px; }
        p { color: #666; line-height: 1.6; margin-bottom: 24px; }
        .status-box {
          background: ${color.bg};
          border: 2px solid ${color.border};
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .btn {
          display: inline-block;
          background: #16a34a;
          color: white;
          padding: 14px 28px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: background 0.2s;
          margin: 8px;
        }
        .btn:hover { background: #15803d; }
        .btn-secondary {
          background: #3b82f6;
        }
        .btn-secondary:hover { background: #2563eb; }
        .logo { font-size: 28px; font-weight: bold; color: #16a34a; margin-bottom: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🌴 Cali Brasil</div>
        <div class="status-box">
          <div class="icon">${color.icon}</div>
          <h1>${title}</h1>
          <p>${message}</p>
        </div>
        ${type === 'success' && orderId ? `
          <a href="${storeUrl}/orders" class="btn">Ver Meus Pedidos</a>
          <a href="${storeUrl}/shop" class="btn btn-secondary">Continuar Comprando</a>
        ` : `
          <a href="${storeUrl}" class="btn">Ir para a Loja</a>
        `}
      </div>
    </body>
    </html>
  `;
}
