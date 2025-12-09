-- Adicionar colunas para suporte a compras de convidados
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS phone TEXT;