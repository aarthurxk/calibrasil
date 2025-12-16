-- Add shipping configuration fields to store_settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS shipping_mode TEXT DEFAULT 'correios';
-- Values: 'correios' (API Correios), 'free' (free shipping for testing), 'fixed' (fixed rate)

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS store_pickup_enabled BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS store_pickup_address TEXT DEFAULT 'Shopping RioMar, Av. República do Líbano, 251 - Piso L1, Recife - PE';

-- Add shipping_method field to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method TEXT;
-- Values: 'pac', 'sedex', 'sedex10', 'sedex12', 'pickup', 'free'

-- Add shipping_cost field to orders table to store the actual shipping cost paid
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;