-- Recreate the view with SECURITY INVOKER to satisfy linter
DROP VIEW IF EXISTS public.shipping_config;

CREATE VIEW public.shipping_config 
WITH (security_invoker = true) AS
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