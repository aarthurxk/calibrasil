-- Atualizar perfil do Arthur
UPDATE public.profiles 
SET full_name = 'Arthur' 
WHERE user_id = 'ce3c515f-1307-4616-ae80-6765e6798d5c';

-- Criar tabela de configurações da loja
CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT DEFAULT 'Cali Store',
  store_email TEXT DEFAULT 'contato@calibrasil.com',
  store_description TEXT DEFAULT 'Produtos Tech premium pro lifestyle moderno',
  currency TEXT DEFAULT 'BRL',
  tax_rate NUMERIC DEFAULT 12,
  free_shipping_threshold NUMERIC DEFAULT 250,
  standard_shipping_rate NUMERIC DEFAULT 29.90,
  notify_orders BOOLEAN DEFAULT true,
  notify_low_stock BOOLEAN DEFAULT true,
  notify_messages BOOLEAN DEFAULT true,
  notify_abandoned_cart BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.store_settings DEFAULT VALUES;

-- Habilitar RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Política: apenas admin pode gerenciar configurações
CREATE POLICY "Admins can manage store settings" ON public.store_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();