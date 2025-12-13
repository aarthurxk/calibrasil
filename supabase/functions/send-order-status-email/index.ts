import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderStatusEmailRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  oldStatus: string;
  newStatus: string;
  trackingCode?: string;
}

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

async function generateConfirmationToken(orderId: string): Promise<string> {
  const secret = Deno.env.get('INTERNAL_API_SECRET') || 'default-secret';
  const data = new TextEncoder().encode(orderId + secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

const getStatusInfo = (status: string): { label: string; emoji: string; color: string; message: string } => {
  const statusMap: Record<string, { label: string; emoji: string; color: string; message: string }> = {
    processing: {
      label: 'Processando',
      emoji: '⚙️',
      color: '#3b82f6',
      message: 'Estamos preparando seu pedido com carinho!'
    },
    shipped: {
      label: 'Enviado',
      emoji: '📦',
      color: '#8b5cf6',
      message: 'Seu pedido está a caminho! Fique de olho no rastreamento.'
    },
    delivered: {
      label: 'Entregue',
      emoji: '✅',
      color: '#16a34a',
      message: 'Seu pedido foi entregue! Esperamos que você ame seus novos produtos.'
    },
    cancelled: {
      label: 'Cancelado',
      emoji: '❌',
      color: '#dc2626',
      message: 'Seu pedido foi cancelado. Se tiver dúvidas, entre em contato conosco.'
    },
    pending: {
      label: 'Pendente',
      emoji: '⏳',
      color: '#eab308',
      message: 'Seu pedido está aguardando processamento.'
    }
  };
  
  return statusMap[status] || {
    label: status,
    emoji: '📋',
    color: '#6b7280',
    message: 'O status do seu pedido foi atualizado.'
  };
};

const generateStatusEmail = async (data: OrderStatusEmailRequest): Promise<string> => {
  const statusInfo = getStatusInfo(data.newStatus);
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const storeUrl = 'https://calibrasil.com';
  
  // Generate confirmation token for shipped orders
  const confirmationToken = await generateConfirmationToken(data.orderId);
  const confirmationUrl = `${supabaseUrl}/functions/v1/confirm-order-received?orderId=${data.orderId}&token=${confirmationToken}`;
  
  // Get first product ID for review link (simplified - links to orders page)
  const reviewUrl = `${storeUrl}/orders`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: ${statusInfo.color}; margin: 0;">${statusInfo.emoji} Pedido ${statusInfo.label}</h1>
        <p style="color: #666; margin-top: 10px;">Atualização do seu pedido Cali Brasil</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0;"><strong>Olá, ${escapeHtml(data.customerName)}!</strong></p>
        <p style="margin: 0;">${statusInfo.message}</p>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0;"><strong>Número do Pedido:</strong> #${data.orderId.substring(0, 8).toUpperCase()}</p>
        <p style="margin: 0;">
          <strong>Status:</strong> 
          <span style="background: ${statusInfo.color}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px;">
            ${statusInfo.label}
          </span>
        </p>
        ${data.trackingCode ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0;"><strong>🚚 Código de Rastreamento:</strong></p>
            <p style="margin: 5px 0 0 0; font-family: monospace; background: #e5e7eb; padding: 8px; border-radius: 4px; font-size: 16px; letter-spacing: 1px;">${escapeHtml(data.trackingCode)}</p>
          </div>
        ` : ''}
      </div>

      ${data.newStatus === 'shipped' ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.linkcorreios.com.br/" style="background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-bottom: 10px;">
            Rastrear Pedido 📍
          </a>
          <br><br>
          <p style="color: #666; margin-bottom: 15px;">Já recebeu seu pedido? Confirme para nós:</p>
          <a href="${confirmationUrl}" style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            ✅ Recebi meu Pedido
          </a>
        </div>
      ` : ''}

      ${data.newStatus === 'delivered' ? `
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #666; margin-bottom: 15px;">Conte pra gente o que achou dos produtos!</p>
          <a href="${reviewUrl}" style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            ⭐ Avaliar minha Compra
          </a>
        </div>
      ` : ''}

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #666; margin: 0;">Dúvidas? Fala com a gente!</p>
        <p style="margin: 10px 0;"><a href="mailto:oi@calibrasil.com" style="color: #16a34a;">oi@calibrasil.com</a></p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} Cali Brasil. Todos os direitos reservados.</p>
      </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify the user is an admin or manager
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[ORDER-STATUS] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[ORDER-STATUS] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin or manager role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || !['admin', 'manager'].includes(roleData.role)) {
      console.error('[ORDER-STATUS] User does not have permission to send order emails');
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin or Manager role required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: OrderStatusEmailRequest = await req.json();
    
    console.log(`[ORDER-STATUS] Sending status update email for order ${data.orderId}`);
    console.log(`[ORDER-STATUS] Status change: ${data.oldStatus} -> ${data.newStatus}`);

    const statusInfo = getStatusInfo(data.newStatus);
    const emailHtml = await generateStatusEmail(data);

    const emailResult = await resend.emails.send({
      from: "Cali Brasil <pedidos@calibrasil.com>",
      to: [data.customerEmail],
      subject: `${statusInfo.emoji} Seu pedido foi ${statusInfo.label.toLowerCase()}! #${data.orderId.substring(0, 8).toUpperCase()}`,
      html: emailHtml,
    });

    console.log("[ORDER-STATUS] Email sent successfully");

    return new Response(
      JSON.stringify({ success: true, emailResult }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[ORDER-STATUS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
