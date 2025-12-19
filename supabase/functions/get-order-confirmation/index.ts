import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientIP);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// HMAC-SHA256 token generation/verification
async function generateHMAC(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

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

    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    if (!checkRateLimit(clientIP)) {
      logStep("Rate limit exceeded", { ip: clientIP });
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    const { order_id, token } = await req.json();
    
    if (!order_id) {
      logStep("Missing order_id");
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!token) {
      logStep("Missing token");
      return new Response(
        JSON.stringify({ error: "token is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Verify HMAC token
    const secret = Deno.env.get("INTERNAL_API_SECRET");
    if (!secret) {
      logStep("ERROR: INTERNAL_API_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const expectedToken = await generateHMAC(order_id, secret);
    if (token !== expectedToken) {
      logStep("Invalid token", { order_id });
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    logStep("Token verified, fetching order", { order_id });

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
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
