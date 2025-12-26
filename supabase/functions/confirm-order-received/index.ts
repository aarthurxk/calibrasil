import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML template for success
function successHTML(orderId: string, frontendUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recebimento Confirmado - Cali</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #22c55e; font-size: 24px; margin-bottom: 12px; }
    p { color: #64748b; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      background: #0ea5e9;
      color: white;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn:hover { background: #0284c7; }
    .secondary { 
      display: block;
      margin-top: 16px;
      color: #64748b;
      text-decoration: none;
      font-size: 14px;
    }
    .secondary:hover { color: #0ea5e9; }
  </style>
  <meta http-equiv="refresh" content="5;url=${frontendUrl}/meus-pedidos">
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Recebimento Confirmado!</h1>
    <p>Obrigado por confirmar o recebimento do seu pedido. Esperamos que você aproveite seus produtos!</p>
    <a href="${frontendUrl}/meus-pedidos" class="btn">Ver Meus Pedidos</a>
    <a href="${frontendUrl}" class="secondary">Voltar para a loja</a>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
      Redirecionando automaticamente em 5 segundos...
    </p>
  </div>
</body>
</html>`;
}

// HTML template for errors
function errorHTML(message: string, frontendUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erro - Cali</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #ef4444; font-size: 24px; margin-bottom: 12px; }
    p { color: #64748b; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
    .message { 
      background: #fef2f2; 
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      color: #dc2626;
    }
    .btn {
      display: inline-block;
      background: #0ea5e9;
      color: white;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn:hover { background: #0284c7; }
    .help {
      margin-top: 20px;
      font-size: 14px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>Ops! Algo deu errado</h1>
    <div class="message">${message}</div>
    <p>Se você acredita que isso é um erro, entre em contato com nosso suporte.</p>
    <a href="${frontendUrl}" class="btn">Voltar para a loja</a>
    <p class="help">
      Precisa de ajuda? <a href="${frontendUrl}/contato" style="color: #0ea5e9;">Fale conosco</a>
    </p>
  </div>
</body>
</html>`;
}

// HTML for already confirmed
function alreadyConfirmedHTML(frontendUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Já Confirmado - Cali</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #fefce8 0%, #fef08a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #ca8a04; font-size: 24px; margin-bottom: 12px; }
    p { color: #64748b; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      background: #0ea5e9;
      color: white;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn:hover { background: #0284c7; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">ℹ️</div>
    <h1>Recebimento Já Confirmado</h1>
    <p>Este pedido já teve o recebimento confirmado anteriormente. Obrigado!</p>
    <a href="${frontendUrl}/meus-pedidos" class="btn">Ver Meus Pedidos</a>
  </div>
</body>
</html>`;
}

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

    // Handle both GET (from email link) and POST (from frontend)
    if (req.method === "GET") {
      const url = new URL(req.url);
      orderId = url.searchParams.get('orderId');
      token = url.searchParams.get('token');
    } else if (req.method === "POST") {
      const body = await req.json();
      orderId = body.orderId;
      token = body.token;
    }

    console.log(`[CONFIRM-RECEIVED] Processing order: ${orderId}, method: ${req.method}`);

    // Validate parameters
    if (!orderId) {
      console.error('[CONFIRM-RECEIVED] Missing orderId');
      if (req.method === "GET") {
        return new Response(errorHTML('Pedido não especificado. Verifique o link do email.', frontendUrl), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }
        });
      }
      return new Response(
        JSON.stringify({ error: 'Pedido não especificado.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!token) {
      console.error('[CONFIRM-RECEIVED] Missing token');
      if (req.method === "GET") {
        return new Response(errorHTML('Token de confirmação não encontrado. Verifique o link do email.', frontendUrl), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }
        });
      }
      return new Response(
        JSON.stringify({ error: 'Token de confirmação não encontrado.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, received_at')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error('[CONFIRM-RECEIVED] Order not found:', orderError);
      if (req.method === "GET") {
        return new Response(errorHTML('Pedido não encontrado. Verifique se o link está correto.', frontendUrl), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }
        });
      }
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado.' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and use the token via database function
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_order_confirm_token', {
        p_order_id: orderId,
        p_token: token
      });

    if (validationError) {
      console.error('[CONFIRM-RECEIVED] Validation error:', validationError);
      if (req.method === "GET") {
        return new Response(errorHTML('Erro ao validar token. Tente novamente mais tarde.', frontendUrl), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }
        });
      }
      return new Response(
        JSON.stringify({ error: 'Erro ao validar token.' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle validation result
    if (!validationResult?.valid) {
      const errorMessages: Record<string, string> = {
        'token_not_found': 'Link de confirmação não encontrado. Solicite um novo email.',
        'token_already_used': 'Este link já foi utilizado anteriormente.',
        'token_expired': 'Este link expirou. Solicite um novo email de confirmação.',
        'token_invalid': 'Link de confirmação inválido. Verifique se copiou corretamente.'
      };
      
      const errorMsg = errorMessages[validationResult?.error] || 'Erro de validação desconhecido.';
      console.error(`[CONFIRM-RECEIVED] Token validation failed: ${validationResult?.error}`);
      
      // Special case: already used means already confirmed
      if (validationResult?.error === 'token_already_used') {
        if (req.method === "GET") {
          return new Response(alreadyConfirmedHTML(frontendUrl), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }
          });
        }
        return new Response(
          JSON.stringify({ alreadyConfirmed: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (req.method === "GET") {
        return new Response(errorHTML(errorMsg, frontendUrl), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }
        });
      }
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CONFIRM-RECEIVED] Order ${orderId} marked as delivered successfully`);

    // Success response
    if (req.method === "GET") {
      return new Response(successHTML(orderId, frontendUrl), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }
      });
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[CONFIRM-RECEIVED] Unexpected error:", error);
    if (req.method === "GET") {
      return new Response(errorHTML('Ocorreu um erro inesperado. Tente novamente mais tarde.', frontendUrl), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" }
      });
    }
    return new Response(
      JSON.stringify({ error: 'Ocorreu um erro inesperado.' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
