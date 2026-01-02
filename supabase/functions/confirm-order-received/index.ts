import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Status codes padronizados
type ConfirmStatus = "confirmed" | "already" | "invalid" | "expired" | "error";

interface ApiResponse {
  status: ConfirmStatus;
  message_pt: string;
}

const statusMessages: Record<ConfirmStatus, string> = {
  confirmed: "Recebimento confirmado com sucesso! Agora você pode avaliar seus produtos.",
  already: "Este pedido já havia sido confirmado anteriormente. Você pode avaliar os produtos.",
  invalid: "Link inválido. O token não corresponde ao pedido.",
  expired: "Este link expirou. Solicite um novo link.",
  error: "Ocorreu um erro ao processar sua solicitação.",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Apenas POST permitido
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ status: "error", message_pt: "Método não permitido. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse body
    let orderId: string | null = null;
    let token: string | null = null;

    try {
      const body = await req.json();
      orderId = body.orderId;
      token = body.token;
    } catch {
      console.error("[CONFIRM] Failed to parse JSON body");
      return jsonResponse({ status: "error", message_pt: "Requisição inválida." }, 400);
    }

    console.log(`[CONFIRM] Processing order: ${orderId?.substring(0, 8)}`);

    // Validar parâmetros
    if (!orderId || typeof orderId !== "string") {
      console.error("[CONFIRM] Missing orderId");
      return jsonResponse({ status: "error", message_pt: "ID do pedido não fornecido." }, 400);
    }

    if (!token || typeof token !== "string") {
      console.error("[CONFIRM] Missing token");
      return jsonResponse({ status: "invalid", message_pt: statusMessages.invalid }, 400);
    }

    // Verificar se pedido existe
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, received_at")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("[CONFIRM] DB error:", orderError);
      return jsonResponse({ status: "error", message_pt: statusMessages.error }, 500);
    }

    if (!order) {
      console.error("[CONFIRM] Order not found:", orderId.substring(0, 8));
      return jsonResponse({ status: "error", message_pt: "Pedido não encontrado." }, 404);
    }

    // IDEMPOTÊNCIA: Se já está confirmado (delivered ou received), retornar sucesso
    if (order.status === "delivered" || order.status === "received" || order.received_at) {
      console.log(`[CONFIRM] Order ${orderId.substring(0, 8)} already confirmed (status: ${order.status})`);
      
      // Log da tentativa
      await logAudit(supabase, orderId, "already", req);
      
      return jsonResponse({ status: "already", message_pt: statusMessages.already }, 200);
    }

    // Validar token via RPC (valida hash, expiração e uso único)
    const { data: validationResult, error: validationError } = await supabase.rpc(
      "validate_order_confirm_token",
      { p_order_id: orderId, p_token: token }
    );

    if (validationError) {
      console.error("[CONFIRM] Validation RPC error:", validationError);
      await logAudit(supabase, orderId, "error", req, { error: validationError.message });
      return jsonResponse({ status: "error", message_pt: statusMessages.error }, 500);
    }

    console.log("[CONFIRM] Validation result:", validationResult);

    // Processar resultado da validação
    if (!validationResult?.valid) {
      const errorType = validationResult?.error;
      console.error(`[CONFIRM] Token validation failed: ${errorType}`);

      // Mapear erros específicos
      let status: ConfirmStatus = "invalid";
      if (errorType === "token_expired") status = "expired";
      if (errorType === "token_already_used") status = "already";

      await logAudit(supabase, orderId, status, req, { error: errorType });

      // Se token já foi usado, ainda permite avaliar
      if (status === "already") {
        return jsonResponse({ status: "already", message_pt: statusMessages.already }, 200);
      }

      return jsonResponse({ status, message_pt: statusMessages[status] }, 200);
    }

    // Sucesso! O RPC já atualizou o pedido e marcou o token como usado
    // Nota: O RPC validate_order_confirm_token já atualiza status para 'delivered' e received_at
    console.log(`[CONFIRM] Order ${orderId.substring(0, 8)} confirmed successfully`);
    await logAudit(supabase, orderId, "confirmed", req);

    return jsonResponse({ status: "confirmed", message_pt: statusMessages.confirmed }, 200);

  } catch (error) {
    console.error("[CONFIRM] Unexpected error:", error);
    return jsonResponse({ status: "error", message_pt: statusMessages.error }, 500);
  }
});

// Helper: JSON response with proper headers and CORS
function jsonResponse(data: ApiResponse, statusCode: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// Helper: Log para auditoria
async function logAudit(
  supabase: any,
  orderId: string,
  status: string,
  req: Request,
  metadata?: Record<string, any>
) {
  try {
    await supabase.from("audit_logs").insert({
      action: "confirm_order_received",
      entity_type: "order",
      entity_id: orderId,
      metadata: { 
        status, 
        confirmed_at: new Date().toISOString(),
        ...metadata 
      },
      user_agent: req.headers.get("user-agent"),
    });
    console.log(`[CONFIRM] Audit log created for order ${orderId.substring(0, 8)}`);
  } catch (e) {
    console.error("[CONFIRM] Failed to log audit:", e);
  }
}
