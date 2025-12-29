import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MagicTokenPayload {
  email: string;
  orderId: string;
  iat: number;
  exp: number;
  purpose: string;
}

/**
 * Get Order Items using Magic Token
 * 
 * This endpoint allows unauthenticated users to fetch their order items
 * using a valid magic login token (from email confirmation links).
 * 
 * POST /get-order-items-magic
 * Body: { token, orderId }
 */
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { token, orderId } = await req.json();

    console.log(`[GET-ORDER-ITEMS-MAGIC] Request for orderId: ${orderId}`);

    if (!token || typeof token !== "string") {
      console.error("[GET-ORDER-ITEMS-MAGIC] Missing token");
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!orderId || typeof orderId !== "string") {
      console.error("[GET-ORDER-ITEMS-MAGIC] Missing orderId");
      return new Response(
        JSON.stringify({ error: "Order ID inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get JWT secret
    const jwtSecret = Deno.env.get("MAGIC_LOGIN_JWT_SECRET");
    if (!jwtSecret) {
      console.error("[GET-ORDER-ITEMS-MAGIC] JWT secret not configured");
      return new Response(
        JSON.stringify({ error: "Configuração inválida" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create crypto key for verification
    const encoder = new TextEncoder();
    const keyData = encoder.encode(jwtSecret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    // Verify JWT
    let payload: MagicTokenPayload;
    try {
      payload = await verify(token, cryptoKey) as unknown as MagicTokenPayload;
    } catch (verifyError: any) {
      console.error("[GET-ORDER-ITEMS-MAGIC] Token verification failed:", verifyError.message);
      
      if (verifyError.message?.includes("expired")) {
        return new Response(
          JSON.stringify({ error: "Token expirado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify purpose
    if (payload.purpose !== "magic_login") {
      console.error("[GET-ORDER-ITEMS-MAGIC] Invalid token purpose");
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify orderId matches token
    if (payload.orderId !== orderId) {
      console.error("[GET-ORDER-ITEMS-MAGIC] Order ID mismatch");
      return new Response(
        JSON.stringify({ error: "Order ID não corresponde ao token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[GET-ORDER-ITEMS-MAGIC] Token valid for order ${orderId}, email: ${payload.email}`);

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch order items
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("id, product_id, product_name, price, quantity")
      .eq("order_id", orderId);

    if (itemsError) {
      console.error("[GET-ORDER-ITEMS-MAGIC] Error fetching items:", itemsError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar itens do pedido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch product details for images
    const productIds = orderItems
      ?.map((item: any) => item.product_id)
      .filter(Boolean) as string[] || [];

    let products: any[] = [];
    if (productIds.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, image, category")
        .in("id", productIds);

      if (!productsError && productsData) {
        products = productsData;
      }
    }

    console.log(`[GET-ORDER-ITEMS-MAGIC] Found ${orderItems?.length || 0} items, ${products.length} products`);

    return new Response(
      JSON.stringify({ 
        orderItems: orderItems || [], 
        products,
        email: payload.email 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[GET-ORDER-ITEMS-MAGIC] Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
