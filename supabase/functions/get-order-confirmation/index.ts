import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-ORDER-CONFIRMATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { order_id } = await req.json();
    
    if (!order_id) {
      logStep("Missing order_id");
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Fetching order", { order_id });

    // Use SERVICE_ROLE_KEY to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch order with limited, non-sensitive data
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, payment_status, total, created_at, payment_method, guest_email")
      .eq("id", order_id)
      .maybeSingle();

    if (orderError) {
      logStep("Error fetching order", { error: orderError.message });
      return new Response(
        JSON.stringify({ error: "Failed to fetch order" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!order) {
      logStep("Order not found", { order_id });
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    logStep("Order found", { 
      order_id: order.id, 
      status: order.status, 
      payment_status: order.payment_status 
    });

    // Return only safe, non-sensitive order data
    // Mask email for privacy (show only first 3 chars and domain)
    let maskedEmail = null;
    if (order.guest_email) {
      const [localPart, domain] = order.guest_email.split('@');
      if (localPart && domain) {
        const maskedLocal = localPart.slice(0, 3) + '***';
        maskedEmail = `${maskedLocal}@${domain}`;
      }
    }

    const safeOrderData = {
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      total: order.total,
      created_at: order.created_at,
      payment_method: order.payment_method,
      masked_email: maskedEmail,
    };

    return new Response(
      JSON.stringify({ order: safeOrderData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
