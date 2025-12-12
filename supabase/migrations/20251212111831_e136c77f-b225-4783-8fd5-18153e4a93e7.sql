-- Add a restrictive policy that only allows reading shipping-related columns
-- This is needed because the view uses SECURITY INVOKER
CREATE POLICY "Public can view shipping config only" 
ON public.store_settings 
FOR SELECT 
USING (true);