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
      <a href="${baseUrl}/review/${item.product_id}" class="btn">Avaliar ⭐</a>
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
    // Header: x-internal-secret
    // ENV: INTERNAL_API_SECRET
    const internalSecret = req.headers.get("x-internal-secret");
    const expectedSecret = Deno.env.get("INTERNAL_API_SECRET");

    if (!internalSecret) {
      console.error("[REVIEW-REQUEST] Faltou header x-internal-secret");
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Faltou header x-internal-secret" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (internalSecret !== expectedSecret) {
      console.error("[REVIEW-REQUEST] Header x-internal-secret inválido");
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Header x-internal-secret inválido" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for test mode
    let testMode = false;
    let testEmail: string | null = null;
    try {
      const body = await req.json();
      testMode = body.testMode === true;
      testEmail = body.testEmail || null;
    } catch {
      // No body or invalid JSON, continue with production mode
    }

    console.log("[REVIEW-REQUEST] Starting. testMode:", testMode, "testEmail:", testEmail);

    const baseUrl = Deno.env.get("FRONTEND_URL") || "https://calibrasil.com";

    // TEST MODE: Send mock data to test email immediately
    if (testMode && testEmail) {
      console.log("[REVIEW-REQUEST] TEST MODE - Sending mock email to:", testEmail);

      const mockItems: OrderItem[] = [
        { product_id: "mock-prod-1", product_name: "Boné Cali Classic", price: 89.90, quantity: 1 },
        { product_id: "mock-prod-2", product_name: "Camiseta Sunset", price: 129.90, quantity: 2 }
      ];

      // Generate simple test HTML since we may not have template
      const productsHtml = generateProductsHtml(mockItems, baseUrl);
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #16a34a;">🌟 [TESTE] Avalie seus produtos!</h1>
          <p>Olá Testador!</p>
          <p>Seu pedido <strong>#MOCKTEST</strong> foi entregue. Que tal avaliar?</p>
          <div style="margin: 20px 0;">
            ${productsHtml}
          </div>
          <p style="color: #666; font-size: 12px;">Este é um email de teste. Nenhum pedido real foi processado.</p>
        </body>
        </html>
      `;

      const emailResult = await resend.emails.send({
        from: "Cali Brasil <pedidos@calibrasil.com>",
        to: [testEmail],
        subject: "🌟 [TESTE] Avalie seus produtos da Cali Brasil!",
        html: testHtml,
      });

      console.log("[REVIEW-REQUEST] TEST email sent:", emailResult);

      return new Response(
        JSON.stringify({ 
          success: true, 
          testMode: true, 
          message: `Email de teste enviado para ${testEmail}`,
          emailResult 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // PRODUCTION MODE: Normal logic
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