-- Create a view for public shipping configuration (only needed fields)
CREATE VIEW public.shipping_config AS
SELECT 
  free_shipping_threshold, 
  standard_shipping_rate, 
  delivery_min_days, 
  delivery_max_days, 
  currency
FROM store_settings
LIMIT 1;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.shipping_config TO anon;
GRANT SELECT ON public.shipping_config TO authenticated;

-- Drop the overly permissive public policy on store_settings
DROP POLICY IF EXISTS "Public can view shipping settings" ON public.store_settings;