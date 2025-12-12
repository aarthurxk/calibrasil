-- Drop the view approach, use a function instead
DROP VIEW IF EXISTS public.shipping_config;

-- Drop the public policy we just added
DROP POLICY IF EXISTS "Public can view shipping config only" ON public.store_settings;

-- Create a SECURITY DEFINER function that returns only shipping config
-- This is safer because it's a function, not a view, and explicitly limits returned columns
CREATE OR REPLACE FUNCTION public.get_shipping_config()
RETURNS TABLE (
  free_shipping_threshold numeric,
  standard_shipping_rate numeric,
  delivery_min_days integer,
  delivery_max_days integer,
  currency text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    free_shipping_threshold,
    standard_shipping_rate,
    delivery_min_days,
    delivery_max_days,
    currency
  FROM store_settings
  LIMIT 1;
$$;