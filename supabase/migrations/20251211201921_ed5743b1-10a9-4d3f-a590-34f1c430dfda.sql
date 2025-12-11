-- Alter color column from TEXT to TEXT[] (array)
ALTER TABLE public.products 
ALTER COLUMN color TYPE TEXT[] USING CASE WHEN color IS NOT NULL THEN ARRAY[color] ELSE NULL END;

-- Alter model column from TEXT to TEXT[] (array)
ALTER TABLE public.products 
ALTER COLUMN model TYPE TEXT[] USING CASE WHEN model IS NOT NULL THEN ARRAY[model] ELSE NULL END;

-- Add color_codes JSONB column for hex color mapping
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS color_codes JSONB DEFAULT '{}'::jsonb;