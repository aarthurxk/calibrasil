-- Add delivery time configuration to store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS delivery_min_days integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS delivery_max_days integer DEFAULT 10;