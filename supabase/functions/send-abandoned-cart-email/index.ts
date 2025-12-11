import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface AbandonedCart {
  id: string;
  user_id: string;
  items: CartItem[];
  total: number;
  email_sent: boolean;
  created_at: string;
}

const formatPrice = (price: number): string => {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const generateItemsHtml = (items: CartItem[]): string => {
  return items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 10px; vertical-align: middle;">` : ''}
        ${item.name}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price)}</td>
    </tr>
  `).join('');
};

const generateAbandonedCartEmail = (items: CartItem[], total: number): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #16a34a; margin: 0;">🛒 Esqueceu algo?</h1>
        <p style="color: #666; margin-top: 10px;">Seus produtos estão te esperando na Cali Brasil!</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0; text-align: center; font-size: 18px;">
          Você deixou <strong>${items.length} ${items.length === 1 ? 'item' : 'itens'}</strong> no seu carrinho
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left;">Produto</th>
            <th style="padding: 12px; text-align: center;">Qtd</th>
            <th style="padding: 12px; text-align: right;">Preço</th>
          </tr>
        </thead>
        <tbody>
          ${generateItemsHtml(items)}
        </tbody>
        <tfoot>
          <tr style="background: #16a34a; color: white;">
            <td colspan="2" style="padding: 12px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 12px; text-align: right;"><strong>${formatPrice(total)}</strong></td>
          </tr>
        </tfoot>
      </table>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://calibrasil.com/cart" style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Finalizar Compra 🎉
        </a>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #666; margin: 0;">Precisa de ajuda? Fala com a gente!</p>
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[ABANDONED-CART] Starting check for abandoned carts...");

    // Find abandoned carts older than 2 hours that haven't been emailed
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: abandonedCarts, error: fetchError } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('email_sent', false)
      .eq('recovered', false)
      .lt('updated_at', twoHoursAgo);

    if (fetchError) {
      console.error("[ABANDONED-CART] Error fetching carts:", fetchError);
      throw fetchError;
    }

    console.log(`[ABANDONED-CART] Found ${abandonedCarts?.length || 0} abandoned carts`);

    if (!abandonedCarts || abandonedCarts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No abandoned carts to process" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results = [];

    for (const cart of abandonedCarts) {
      try {
        // Get user email from profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', cart.user_id)
          .single();

        // Get email from auth.users via edge function workaround - use user_id to get email
        const { data: userData } = await supabase.auth.admin.getUserById(cart.user_id);
        
        if (!userData?.user?.email) {
          console.log(`[ABANDONED-CART] No email for user ${cart.user_id}, skipping`);
          continue;
        }

        const items = cart.items as CartItem[];
        const customerEmail = userData.user.email;
        const customerName = profile?.full_name || 'Cliente';

        console.log(`[ABANDONED-CART] Sending email for cart ${cart.id}`);

        const emailResult = await resend.emails.send({
          from: "Cali Brasil <pedidos@calibrasil.com>",
          to: [customerEmail],
          subject: `🛒 Ei ${customerName}, você esqueceu algo!`,
          html: generateAbandonedCartEmail(items, cart.total),
        });

        // Mark cart as email sent
        await supabase
          .from('abandoned_carts')
          .update({ email_sent: true })
          .eq('id', cart.id);

        console.log(`[ABANDONED-CART] Email sent for cart ${cart.id}`);
        results.push({ cartId: cart.id, success: true, emailResult });
      } catch (cartError: any) {
        console.error(`[ABANDONED-CART] Error processing cart ${cart.id}:`, cartError);
        results.push({ cartId: cart.id, success: false, error: cartError.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[ABANDONED-CART] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
