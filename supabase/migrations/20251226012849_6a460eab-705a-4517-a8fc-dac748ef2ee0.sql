-- =====================================================
-- SEGURANÇA: Tabelas de Auditoria e Idempotência
-- =====================================================

-- Tabela para registrar eventos de webhook (idempotência)
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'stripe' ou 'mercadopago'
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payload JSONB,
  CONSTRAINT webhook_events_unique UNIQUE (event_id, provider)
);

-- Índice para busca rápida por event_id
CREATE INDEX idx_webhook_events_event_id ON public.webhook_events (event_id, provider);

-- RLS: Apenas admin pode ver
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage webhook_events"
ON public.webhook_events
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- Tabela de Auditoria
-- =====================================================
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action TEXT NOT NULL, -- 'login', 'create', 'update', 'delete', 'import', 'rollback', 'webhook', etc.
  entity_type TEXT NOT NULL, -- 'product', 'order', 'user', 'coupon', etc.
  entity_id TEXT, -- ID da entidade afetada
  previous_state JSONB, -- Estado anterior (para updates/deletes)
  new_state JSONB, -- Novo estado (para creates/updates)
  metadata JSONB, -- Dados adicionais (IP, user agent, etc.)
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas comuns
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- RLS: Apenas admin pode ler, inserção via service role
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read audit_logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Permitir inserção via authenticated users (os logs são inseridos via edge functions com service role)
CREATE POLICY "Service insert audit_logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- =====================================================
-- Função para registrar audit log
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_audit(
  p_user_id uuid,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO audit_logs (
    user_id, action, entity_type, entity_id,
    previous_state, new_state, metadata,
    ip_address, user_agent
  )
  VALUES (
    p_user_id, p_action, p_entity_type, p_entity_id,
    p_previous_state, p_new_state, p_metadata,
    p_ip_address, p_user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- =====================================================
-- Função para verificar evento de webhook já processado
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_webhook_processed(
  p_event_id TEXT,
  p_provider TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM webhook_events
    WHERE event_id = p_event_id AND provider = p_provider
  );
END;
$$;

-- =====================================================
-- Função para registrar evento de webhook processado
-- =====================================================
CREATE OR REPLACE FUNCTION public.mark_webhook_processed(
  p_event_id TEXT,
  p_provider TEXT,
  p_event_type TEXT,
  p_payload JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO webhook_events (event_id, provider, event_type, payload)
  VALUES (p_event_id, p_provider, p_event_type, p_payload)
  ON CONFLICT (event_id, provider) DO NOTHING;
  
  RETURN FOUND;
END;
$$;