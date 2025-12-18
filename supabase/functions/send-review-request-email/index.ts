import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  received_at: string;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

function generateProductsHtml(items: OrderItem[], baseUrl: string): string {
  return items.map(item => `
    <div class="product">
      <div class="product-info">
        <h4 style="margin:0 0 5px 0">${escapeHtml(item.product_name)}</h4>
        <p style="margin:0;color:#666">Quantidade: ${item.quantity} | ${formatPrice(item.price)}</p>
      </div>
      <a href="${baseUrl}/product/${item.product_id}#reviews" class="btn">Avaliar ⭐</a>
    </div>
  `).join('');
}

serve(async (req) => {
  console.log("[REVIEW-REQUEST] Function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify internal secret
    const internalSecret = req.headers.get("x-internal-secret");
    const expectedSecret = Deno.env.get("INTERNAL_API_SECRET");

    if (!internalSecret || internalSecret !== expectedSecret) {
      console.error("[REVIEW-REQUEST] Invalid internal secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate 1 day ago
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const oneDayAgoStr = oneDayAgo.toISOString();

    // Find orders delivered 1+ day ago that haven't received review email
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, user_id, guest_email, received_at")
      .eq("status", "delivered")
      .eq("review_email_sent", false)
      .not("received_at", "is", null)
      .lte("received_at", oneDayAgoStr);

    if (ordersError) {
      console.error("[REVIEW-REQUEST] Error fetching orders:", ordersError);
      throw ordersError;
    }

    if (!orders || orders.length === 0) {
      console.log("[REVIEW-REQUEST] No eligible orders found");
      return new Response(JSON.stringify({ success: true, message: "No eligible orders", processed: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[REVIEW-REQUEST] Found ${orders.length} eligible orders`);

    // Fetch email template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("subject, html_content")
      .eq("template_key", "review_request")
      .eq("is_active", true)
      .maybeSingle();

    if (templateError || !template) {
      console.error("[REVIEW-REQUEST] Error fetching template:", templateError);
      throw new Error("Template not found");
    }

    const baseUrl = Deno.env.get("FRONTEND_URL") || "https://calibrasil.com";
    const processedOrders: string[] = [];

    for (const order of orders) {
      try {
        // Get customer email
        let customerEmail: string | null = order.guest_email;
        let customerName = "Cliente";

        if (order.user_id) {
          // Get user email from auth
          const { data: userData } = await supabase.auth.admin.getUserById(order.user_id);
          if (userData?.user?.email) {
            customerEmail = userData.user.email;
          }

          // Get profile name
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", order.user_id)
            .maybeSingle();

          if (profile?.full_name) {
            customerName = profile.full_name.split(" ")[0];
          }
        }

        if (!customerEmail) {
          console.log(`[REVIEW-REQUEST] No email for order ${order.id}, skipping`);
          continue;
        }

        // Get order items
        const { data: items, error: itemsError } = await supabase
          .from("order_items")
          .select("product_id, product_name, price, quantity")
          .eq("order_id", order.id);

        if (itemsError || !items || items.length === 0) {
          console.log(`[REVIEW-REQUEST] No items for order ${order.id}, skipping`);
          continue;
        }

        // Generate products HTML
        const productsHtml = generateProductsHtml(items, baseUrl);

        // Replace variables in template
        const htmlContent = replaceVariables(template.html_content, {
          customer_name: escapeHtml(customerName),
          order_id: order.id.slice(0, 8).toUpperCase(),
          products_html: productsHtml,
        });

        const subject = replaceVariables(template.subject, {
          customer_name: escapeHtml(customerName),
          order_id: order.id.slice(0, 8).toUpperCase(),
        });

        // Send email
        const { error: emailError } = await resend.emails.send({
          from: "Cali Brasil <pedidos@calibrasil.com>",
          to: [customerEmail],
          subject: subject,
          html: htmlContent,
        });

        if (emailError) {
          console.error(`[REVIEW-REQUEST] Error sending email for order ${order.id}:`, emailError);
          continue;
        }

        // Mark as sent
        await supabase
          .from("orders")
          .update({ review_email_sent: true })
          .eq("id", order.id);

        processedOrders.push(order.id);
        console.log(`[REVIEW-REQUEST] Email sent for order ${order.id}`);
      } catch (orderError) {
        console.error(`[REVIEW-REQUEST] Error processing order ${order.id}:`, orderError);
      }
    }

    console.log(`[REVIEW-REQUEST] Processed ${processedOrders.length} orders`);

    return new Response(
      JSON.stringify({ success: true, processed: processedOrders.length, orders: processedOrders }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[REVIEW-REQUEST] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});