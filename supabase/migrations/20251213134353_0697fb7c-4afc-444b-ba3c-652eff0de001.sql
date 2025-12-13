-- Add payment_gateway column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'stripe';

-- Add pagseguro_transaction_id column for tracking PagSeguro transactions
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pagseguro_transaction_id TEXT;