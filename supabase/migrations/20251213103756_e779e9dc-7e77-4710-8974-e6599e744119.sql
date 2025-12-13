-- Adicionar colunas para rastreamento e confirmação de recebimento
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_code TEXT,
ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE;

-- Atualizar função handle_new_user para vincular pedidos guest automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Criar perfil do usuário
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Criar role de customer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  -- NOVA FEATURE: Vincular pedidos guest ao novo usuário
  -- Quando alguém cria conta com email usado em compras como visitante,
  -- todos os pedidos anteriores são automaticamente vinculados à nova conta
  UPDATE public.orders
  SET user_id = NEW.id
  WHERE guest_email = NEW.email
    AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Executar vinculação retroativa de pedidos guest para usuários já existentes
UPDATE public.orders o
SET user_id = au.id
FROM auth.users au
WHERE o.guest_email = au.email
  AND o.user_id IS NULL;