-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can validate active sellers" ON public.sellers;

-- Create a security definer function to safely validate seller codes
-- This only returns the minimal data needed for customer discount application
CREATE OR REPLACE FUNCTION public.validate_seller_code(seller_code TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  code TEXT,
  discount_percent NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.code, s.discount_percent
  FROM public.sellers s
  WHERE s.code = UPPER(TRIM(seller_code))
    AND s.is_active = true
  LIMIT 1;
$$;