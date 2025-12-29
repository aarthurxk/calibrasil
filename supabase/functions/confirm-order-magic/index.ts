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

type ConfirmStatus = "confirmed" | "already" | "invalid" | "expired" | "error";

const statusMessages: Record<ConfirmStatus, string> = {
  confirmed: "Recebimento confirmado com sucesso!",
  already: "Este pedido já havia sido confirmado anteriormente.",
  invalid: "Link inválido. Verifique se copiou o link completo.",
  expired: "Este link expirou. Solicite um novo link de confirmação.",
  error: "Ocorreu um erro ao processar sua solicitação.",
};

/**
 * Confirm Order with Magic Token
 * 
 * Validates the JWT and updates order status to delivered.
 * 
 * POST /confirm-order-magic
 * Body: { token }
 */
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ status: "error", message_pt: "Método não permitido." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      console.error("[CONFIRM-MAGIC] Missing token");
      return new Response(
        JSON.stringify({ status: "invalid", message_pt: statusMessages.invalid }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get JWT secret
    const jwtSecret = Deno.env.get("MAGIC_LOGIN_JWT_SECRET");
    if (!jwtSecret) {
      console.error("[CONFIRM-MAGIC] JWT secret not configured");
      return new Response(
        JSON.stringify({ status: "error", message_pt: statusMessages.error }),
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
      console.error("[CONFIRM-MAGIC] Token verification failed:", verifyError.message);
      
      if (verifyError.message?.includes("expired")) {
        return new Response(
          JSON.stringify({ status: "expired", message_pt: statusMessages.expired }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ status: "invalid", message_pt: statusMessages.invalid }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify purpose
    if (payload.purpose !== "magic_login") {
      return new Response(
        JSON.stringify({ status: "invalid", message_pt: statusMessages.invalid }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CONFIRM-MAGIC] Confirming order ${payload.orderId} for ${payload.email}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check order status
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, received_at")
      .eq("id", payload.orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error("[CONFIRM-MAGIC] Order not found:", orderError);
      return new Response(
        JSON.stringify({ status: "error", message_pt: "Pedido não encontrado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // IDEMPOTENCY: If already confirmed, return success
    if (order.status === "delivered" || order.status === "received" || order.received_at) {
      console.log(`[CONFIRM-MAGIC] Order ${payload.orderId} already confirmed`);
      
      await logAudit(supabase, payload.orderId, "already", payload.email, req);
      
      return new Response(
        JSON.stringify({ status: "already", message_pt: statusMessages.already, orderId: payload.orderId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "delivered",
        received_at: new Date().toISOString(),
      })
      .eq("id", payload.orderId);

    if (updateError) {
      console.error("[CONFIRM-MAGIC] Update error:", updateError);
      await logAudit(supabase, payload.orderId, "error", payload.email, req, { error: updateError.message });
      return new Response(
        JSON.stringify({ status: "error", message_pt: statusMessages.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CONFIRM-MAGIC] Order ${payload.orderId} confirmed successfully`);
    await logAudit(supabase, payload.orderId, "confirmed", payload.email, req);

    return new Response(
      JSON.stringify({ status: "confirmed", message_pt: statusMessages.confirmed, orderId: payload.orderId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[CONFIRM-MAGIC] Error:", error);
    return new Response(
      JSON.stringify({ status: "error", message_pt: statusMessages.error }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function logAudit(
  supabase: any,
  orderId: string,
  status: string,
  email: string,
  req: Request,
  metadata?: Record<string, any>
) {
  try {
    await supabase.from("audit_logs").insert({
      action: "confirm_order_magic",
      entity_type: "order",
      entity_id: orderId,
      metadata: { status, email, ...metadata },
      user_agent: req.headers.get("user-agent"),
    });
  } catch (e) {
    console.error("[CONFIRM-MAGIC] Failed to log audit:", e);
  }
}
