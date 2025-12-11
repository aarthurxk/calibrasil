-- Fix store_settings: Remove public access to sensitive business data
DROP POLICY IF EXISTS "Anyone can view store settings" ON public.store_settings;

-- Create restricted SELECT policy for store_settings (admins and managers only)
CREATE POLICY "Admin and Manager view store settings" 
ON public.store_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create a public view for non-sensitive store info (currency only for client-side formatting)
CREATE OR REPLACE VIEW public.store_public_info AS
SELECT currency FROM public.store_settings LIMIT 1;

-- Grant access to the view
GRANT SELECT ON public.store_public_info TO anon, authenticated;

-- Fix orders: Add explicit protection for guest orders (user_id IS NULL)
-- Update the existing policies to handle guest orders properly
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;

-- Authenticated users can view their own orders (where user_id matches)
CREATE POLICY "Users view own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

-- Guest orders (user_id IS NULL) can only be viewed by admins/managers (already covered by existing policies)
-- The "Admin view all orders" and "Manager view orders" policies already handle this