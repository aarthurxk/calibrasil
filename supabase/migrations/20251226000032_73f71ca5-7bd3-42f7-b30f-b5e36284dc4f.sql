-- Add diagnostic test email configuration to store_settings
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS diagnostic_test_email text DEFAULT 'teste-diag@cali.com.br';