-- Fase 1: Criar tabela de lojas
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Policies para stores
CREATE POLICY "Admin manage stores" ON public.stores FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Manager view stores" ON public.stores FOR SELECT
  USING (has_role(auth.uid(), 'manager'));

-- Fase 2: Criar tabela de estoque por loja
CREATE TABLE public.store_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_variant_id, store_id)
);

-- Habilitar RLS
ALTER TABLE public.store_stock ENABLE ROW LEVEL SECURITY;

-- Policies para store_stock
CREATE POLICY "Admin manage store_stock" ON public.store_stock FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Manager manage store_stock" ON public.store_stock FOR ALL
  USING (has_role(auth.uid(), 'manager'));

-- Fase 3: Criar tabela de transferências
CREATE TABLE public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id UUID NOT NULL REFERENCES public.product_variants(id),
  from_store_id UUID NOT NULL REFERENCES public.stores(id),
  to_store_id UUID NOT NULL REFERENCES public.stores(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  CONSTRAINT different_stores CHECK (from_store_id != to_store_id)
);

-- Habilitar RLS
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

-- Policies para stock_transfers
CREATE POLICY "Admin manage stock_transfers" ON public.stock_transfers FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Manager manage stock_transfers" ON public.stock_transfers FOR ALL
  USING (has_role(auth.uid(), 'manager'));

-- Fase 4: Adicionar campos em order_items
ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS source_store_id UUID REFERENCES public.stores(id),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by UUID;

-- Fase 5: Inserir as 3 lojas iniciais
INSERT INTO public.stores (name, code, display_order) VALUES
  ('Case 1', 'CASE1', 1),
  ('Cali', 'CALI', 2),
  ('Case 2', 'CASE2', 3);

-- Fase 6: Migrar estoque existente para store_stock (concentrado na primeira loja)
INSERT INTO public.store_stock (product_variant_id, store_id, quantity)
SELECT 
  pv.id,
  s.id,
  CASE WHEN s.display_order = 1 THEN pv.stock_quantity ELSE 0 END
FROM public.product_variants pv
CROSS JOIN public.stores s
ON CONFLICT (product_variant_id, store_id) DO NOTHING;

-- Fase 7: Função para calcular estoque total disponível
CREATE OR REPLACE FUNCTION public.get_total_available_stock(p_variant_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(quantity - reserved_quantity), 0)::INTEGER
  FROM store_stock
  WHERE product_variant_id = p_variant_id;
$$;

-- Fase 8: Função para selecionar loja automaticamente
CREATE OR REPLACE FUNCTION public.select_source_store(p_variant_id UUID, p_quantity INTEGER)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id 
  FROM store_stock
  WHERE product_variant_id = p_variant_id
    AND (quantity - reserved_quantity) >= p_quantity
  ORDER BY quantity DESC
  LIMIT 1;
$$;

-- Fase 9: Função para criar transferência
CREATE OR REPLACE FUNCTION public.create_stock_transfer(
  p_variant_id UUID,
  p_from_store_id UUID,
  p_to_store_id UUID,
  p_quantity INTEGER,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer_id UUID;
  v_available INTEGER;
BEGIN
  -- Verificar estoque disponível
  SELECT quantity - reserved_quantity INTO v_available
  FROM store_stock
  WHERE product_variant_id = p_variant_id AND store_id = p_from_store_id;
  
  IF v_available IS NULL OR v_available < p_quantity THEN
    RAISE EXCEPTION 'Estoque insuficiente na loja de origem';
  END IF;
  
  -- Reservar estoque na origem
  UPDATE store_stock
  SET reserved_quantity = reserved_quantity + p_quantity,
      updated_at = now()
  WHERE product_variant_id = p_variant_id AND store_id = p_from_store_id;
  
  -- Criar registro de transferência
  INSERT INTO stock_transfers (product_variant_id, from_store_id, to_store_id, quantity, created_by, notes)
  VALUES (p_variant_id, p_from_store_id, p_to_store_id, p_quantity, p_user_id, p_notes)
  RETURNING id INTO v_transfer_id;
  
  RETURN v_transfer_id;
END;
$$;

-- Fase 10: Função para completar transferência
CREATE OR REPLACE FUNCTION public.complete_stock_transfer(p_transfer_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer RECORD;
BEGIN
  SELECT * INTO v_transfer FROM stock_transfers WHERE id = p_transfer_id;
  
  IF v_transfer IS NULL THEN
    RAISE EXCEPTION 'Transferência não encontrada';
  END IF;
  
  IF v_transfer.status NOT IN ('pending', 'in_transit') THEN
    RAISE EXCEPTION 'Transferência não pode ser completada (status: %)', v_transfer.status;
  END IF;
  
  -- Remover da loja de origem
  UPDATE store_stock
  SET 
    quantity = quantity - v_transfer.quantity,
    reserved_quantity = reserved_quantity - v_transfer.quantity,
    updated_at = now()
  WHERE product_variant_id = v_transfer.product_variant_id 
    AND store_id = v_transfer.from_store_id;
  
  -- Adicionar na loja de destino
  UPDATE store_stock
  SET 
    quantity = quantity + v_transfer.quantity,
    updated_at = now()
  WHERE product_variant_id = v_transfer.product_variant_id 
    AND store_id = v_transfer.to_store_id;
  
  -- Marcar como completada
  UPDATE stock_transfers
  SET status = 'completed', completed_at = now(), completed_by = p_user_id
  WHERE id = p_transfer_id;
  
  RETURN true;
END;
$$;

-- Fase 11: Função para cancelar transferência
CREATE OR REPLACE FUNCTION public.cancel_stock_transfer(p_transfer_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer RECORD;
BEGIN
  SELECT * INTO v_transfer FROM stock_transfers WHERE id = p_transfer_id;
  
  IF v_transfer IS NULL THEN
    RAISE EXCEPTION 'Transferência não encontrada';
  END IF;
  
  IF v_transfer.status NOT IN ('pending', 'in_transit') THEN
    RAISE EXCEPTION 'Transferência não pode ser cancelada (status: %)', v_transfer.status;
  END IF;
  
  -- Liberar estoque reservado na origem
  UPDATE store_stock
  SET 
    reserved_quantity = reserved_quantity - v_transfer.quantity,
    updated_at = now()
  WHERE product_variant_id = v_transfer.product_variant_id 
    AND store_id = v_transfer.from_store_id;
  
  -- Marcar como cancelada
  UPDATE stock_transfers
  SET status = 'cancelled', completed_at = now(), completed_by = p_user_id
  WHERE id = p_transfer_id;
  
  RETURN true;
END;
$$;

-- Fase 12: Trigger para atualizar updated_at
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_stock_updated_at
  BEFORE UPDATE ON public.store_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();