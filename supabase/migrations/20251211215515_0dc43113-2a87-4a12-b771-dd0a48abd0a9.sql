-- Add public read policy for store_settings shipping fields
CREATE POLICY "Public can view shipping settings"
ON public.store_settings
FOR SELECT
TO anon, authenticated
USING (true);