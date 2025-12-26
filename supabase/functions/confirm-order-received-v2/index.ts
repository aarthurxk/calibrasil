import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * CONFIRM ORDER RECEIVED V2
 * 
 * Edge Function pública para confirmar recebimento de pedidos.
 * Aceita POST (preferido) e GET (compatibilidade com links de e-mail antigos).
 * 
 * Fluxo:
 * 1. Valida parâmetros (orderId, token)
 * 2. Verifica se pedido existe
 * 3. Se já está entregue, retorna "already_confirmed" (idempotência)
 * 4. Valida token (hash, expiração, uso único)
 * 5. Atualiza pedido e marca token como usado
 * 6. Registra auditoria
 * 
 * Retorna JSON padronizado:
 * { ok: boolean, status: string, message_pt: string }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ConfirmationStatus = 
  | "confirmed"
  | "already_confirmed"
  | "invalid_token"
  | "expired"
  | "used"
  | "not_found"
  | "error";

interface ConfirmationResponse {
  ok: boolean;
  status: ConfirmationStatus;
  message_pt: string;
}

const statusMessages: Record<ConfirmationStatus, string> = {
  confirmed: "Recebimento confirmado com sucesso! Obrigado por comprar conosco.",
  already_confirmed: "Este pedido já foi confirmado anteriormente.",
  invalid_token: "O link de confirmação é inválido. Por favor, use o link mais recente do seu e-mail.",
  expired: "O link de confirmação expirou. Entre em contato conosco se precisar de ajuda.",
  used: "Este link já foi utilizado. O pedido está confirmado.",
  not_found: "Pedido não encontrado. Verifique se o link está correto.",
  error: "Ocorreu um erro inesperado. Por favor, tente novamente ou entre em contato."
};

function createResponse(status: ConfirmationStatus): ConfirmationResponse {
  return {
    ok: status === "confirmed" || status === "already_confirmed" || status === "used",
    status,
    message_pt: statusMessages[status]
  };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let orderId: string | null = null;
  let token: string | null = null;
  let userAgent: string | null = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // Usar SERVICE ROLE para bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    userAgent = req.headers.get('user-agent') || 'unknown';

    // Extrair parâmetros de POST ou GET
    if (req.method === "POST") {
      try {
        const body = await req.json();
        orderId = body.orderId || null;
        token = body.token || null;
      } catch {
        console.error('[CONFIRM-V2] Failed to parse POST body');
      }
    } else if (req.method === "GET") {
      const url = new URL(req.url);
      orderId = url.searchParams.get('orderId');
      token = url.searchParams.get('token');
    }

    console.log(`[CONFIRM-V2] Request received - method: ${req.method}, orderId: ${orderId?.substring(0, 8)}...`);

    // Validar parâmetros
    if (!orderId) {
      console.error('[CONFIRM-V2] Missing orderId');
      await logAudit(supabase, 'confirm_attempt_failed', null, 'not_found', userAgent, { reason: 'missing_order_id' });
      return jsonResponse(createResponse('not_found'));
    }

    if (!token) {
      console.error('[CONFIRM-V2] Missing token');
      await logAudit(supabase, 'confirm_attempt_failed', orderId, 'invalid_token', userAgent, { reason: 'missing_token' });
      return jsonResponse(createResponse('invalid_token'));
    }

    // Buscar pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, received_at, guest_email, user_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) {
      console.error('[CONFIRM-V2] Database error fetching order:', orderError);
      await logAudit(supabase, 'confirm_attempt_failed', orderId, 'error', userAgent, { error: orderError.message });
      return jsonResponse(createResponse('error'));
    }

    if (!order) {
      console.error('[CONFIRM-V2] Order not found:', orderId);
      await logAudit(supabase, 'confirm_attempt_failed', orderId, 'not_found', userAgent, { reason: 'order_not_found' });
      return jsonResponse(createResponse('not_found'));
    }

    // IDEMPOTÊNCIA: Se já está entregue, retornar sucesso sem validar token
    // Isso garante que links antigos funcionem para pedidos já confirmados
    if (order.status === 'delivered' && order.received_at) {
      console.log(`[CONFIRM-V2] Order ${orderId} already confirmed at ${order.received_at}`);
      await logAudit(supabase, 'confirm_already', orderId, 'already_confirmed', userAgent);
      return jsonResponse(createResponse('already_confirmed'));
    }

    // Validar token via função do banco
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_order_confirm_token', {
        p_order_id: orderId,
        p_token: token
      });

    if (validationError) {
      console.error('[CONFIRM-V2] Token validation RPC error:', validationError);
      await logAudit(supabase, 'confirm_attempt_failed', orderId, 'error', userAgent, { error: validationError.message });
      return jsonResponse(createResponse('error'));
    }

    // Interpretar resultado da validação
    if (!validationResult?.valid) {
      const errorCode = validationResult?.error || 'unknown';
      console.log(`[CONFIRM-V2] Token validation failed: ${errorCode}`);
      
      let status: ConfirmationStatus = 'invalid_token';
      
      switch (errorCode) {
        case 'token_already_used':
          status = 'used';
          break;
        case 'token_expired':
          status = 'expired';
          break;
        case 'token_not_found':
        case 'token_invalid':
          status = 'invalid_token';
          break;
      }

      await logAudit(supabase, 'confirm_attempt_failed', orderId, status, userAgent, { token_error: errorCode });
      return jsonResponse(createResponse(status));
    }

    // Sucesso! Token válido e pedido atualizado pela função RPC
    const duration = Date.now() - startTime;
    console.log(`[CONFIRM-V2] Order ${orderId} confirmed successfully in ${duration}ms`);
    
    await logAudit(supabase, 'confirm_success', orderId, 'confirmed', userAgent, { duration_ms: duration });
    return jsonResponse(createResponse('confirmed'));

  } catch (error: any) {
    console.error("[CONFIRM-V2] Unexpected error:", error);
    
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await logAudit(supabase, 'confirm_attempt_failed', orderId, 'error', userAgent, { 
        error: error.message,
        stack: error.stack?.substring(0, 500)
      });
    } catch {
      // Ignore logging errors
    }

    return jsonResponse(createResponse('error'));
  }
});

function jsonResponse(data: ConfirmationResponse): Response {
  return new Response(
    JSON.stringify(data),
    { 
      status: data.ok ? 200 : 400, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}

async function logAudit(
  supabase: any,
  action: string,
  orderId: string | null,
  status: string,
  userAgent: string | null,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      action,
      entity_type: 'order_confirmation',
      entity_id: orderId,
      user_agent: userAgent?.substring(0, 500),
      metadata: {
        status,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[CONFIRM-V2] Failed to log audit:', error);
  }
}
