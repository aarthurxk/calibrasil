-- Add mercadopago_payment_id column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

-- Optionally, we can keep pagseguro_transaction_id for backwards compatibility
-- or drop it if no longer needed
COMMENT ON COLUMN public.orders.mercadopago_payment_id IS 'Mercado Pago payment/preference ID';