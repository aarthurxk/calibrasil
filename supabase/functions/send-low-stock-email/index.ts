import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LowStockItem {
  productName: string;
  productId: string;
  color: string | null;
  model: string | null;
  currentStock: number;
}

interface LowStockEmailRequest {
  items: LowStockItem[];
}

const generateLowStockEmail = (items: LowStockItem[]): string => {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${item.productName}</strong>
        ${item.color ? `<br><span style="color: #666; font-size: 14px;">Cor: ${item.color}</span>` : ''}
        ${item.model ? `<br><span style="color: #666; font-size: 14px;">Modelo: ${item.model}</span>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
        <span style="background: ${item.currentStock <= 2 ? '#fee2e2' : '#fef3c7'}; color: ${item.currentStock <= 2 ? '#dc2626' : '#d97706'}; padding: 4px 12px; border-radius: 12px; font-weight: bold;">
          ${item.currentStock} ${item.currentStock === 1 ? 'unidade' : 'unidades'}
        </span>
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #dc2626; margin: 0;">⚠️ Alerta de Estoque Baixo</h1>
        <p style="color: #666; margin-top: 10px;">Os seguintes produtos precisam de reposição</p>
      </div>
      
      <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
        <p style="margin: 0; font-size: 18px; color: #dc2626;">
          <strong>${items.length} ${items.length === 1 ? 'produto está' : 'produtos estão'}</strong> com estoque baixo
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left;">Produto</th>
            <th style="padding: 12px; text-align: center;">Estoque</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://calibrasil.com/admin/products" style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Gerenciar Estoque 📦
        </a>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          Este é um email automático do sistema de gestão da Cali Brasil.<br>
          ${new Date().toLocaleString('pt-BR')}
        </p>
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
    const body = await req.json();
    const { items }: LowStockEmailRequest = body;

    // SECURITY: Always verify authentication - check service role key OR admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[LOW-STOCK] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Check if this is a service role call (internal from other edge functions)
    const isServiceRoleCall = token === serviceRoleKey;
    
    // If not using service role, verify user is admin
    if (!isServiceRoleCall) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[LOW-STOCK] Auth error:', authError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError || !roleData || roleData.role !== 'admin') {
        console.error('[LOW-STOCK] User does not have admin permission');
        return new Response(
          JSON.stringify({ error: 'Forbidden - Admin role required' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No low stock items to report" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[LOW-STOCK] Sending alert for ${items.length} items`);

    const emailResult = await resend.emails.send({
      from: "Cali Brasil <pedidos@calibrasil.com>",
      to: ["arthur@calibrasil.com"],
      subject: `⚠️ Alerta: ${items.length} ${items.length === 1 ? 'produto' : 'produtos'} com estoque baixo`,
      html: generateLowStockEmail(items),
    });

    console.log("[LOW-STOCK] Email sent successfully");

    return new Response(
      JSON.stringify({ success: true, emailResult }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[LOW-STOCK] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});