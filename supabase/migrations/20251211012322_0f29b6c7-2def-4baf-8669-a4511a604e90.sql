-- Add SELECT policy for store_settings so anyone can view store configuration
CREATE POLICY "Anyone can view store settings" 
ON public.store_settings
FOR SELECT USING (true);