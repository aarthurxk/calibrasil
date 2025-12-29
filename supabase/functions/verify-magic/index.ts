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
 * Verify Magic Login Token
 * 
 * Validates the JWT from magic link and returns order info
 * for the frontend to redirect to the confirmation page.
 * 
 * POST /verify-magic
 * Body: { token }
 */
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ valid: false, error: "method_not_allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      console.error("[VERIFY-MAGIC] Missing token");
      return new Response(
        JSON.stringify({ valid: false, error: "missing_token", message_pt: "Token não fornecido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get JWT secret
    const jwtSecret = Deno.env.get("MAGIC_LOGIN_JWT_SECRET");
    if (!jwtSecret) {
      console.error("[VERIFY-MAGIC] JWT secret not configured");
      return new Response(
        JSON.stringify({ valid: false, error: "server_error", message_pt: "Erro de configuração do servidor." }),
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
      console.error("[VERIFY-MAGIC] Token verification failed:", verifyError.message);
      
      // Check if expired
      if (verifyError.message?.includes("expired")) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: "token_expired", 
            message_pt: "Este link expirou. Solicite um novo link de confirmação." 
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "token_invalid", 
          message_pt: "Link inválido. Verifique se copiou o link completo." 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify purpose
    if (payload.purpose !== "magic_login") {
      console.error("[VERIFY-MAGIC] Invalid token purpose:", payload.purpose);
      return new Response(
        JSON.stringify({ valid: false, error: "invalid_purpose", message_pt: "Token inválido." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[VERIFY-MAGIC] Token valid for email: ${payload.email}, order: ${payload.orderId}`);

    // Verify order exists
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, received_at, guest_email, user_id")
      .eq("id", payload.orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error("[VERIFY-MAGIC] Order not found:", orderError);
      return new Response(
        JSON.stringify({ valid: false, error: "order_not_found", message_pt: "Pedido não encontrado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already confirmed
    const isAlreadyConfirmed = order.status === "delivered" || order.status === "received" || order.received_at;

    // Log audit
    await supabase.from("audit_logs").insert({
      action: "magic_login_verified",
      entity_type: "order",
      entity_id: payload.orderId,
      metadata: { 
        email: payload.email, 
        already_confirmed: isAlreadyConfirmed,
        order_status: order.status
      },
    });

    return new Response(
      JSON.stringify({ 
        valid: true, 
        email: payload.email,
        orderId: payload.orderId,
        orderStatus: order.status,
        isAlreadyConfirmed,
        message_pt: isAlreadyConfirmed 
          ? "Este pedido já foi confirmado anteriormente." 
          : "Token válido. Você pode confirmar o recebimento."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[VERIFY-MAGIC] Error:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "server_error", message_pt: "Erro inesperado. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
