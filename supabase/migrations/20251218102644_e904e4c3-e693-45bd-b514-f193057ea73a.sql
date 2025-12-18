-- Fix: Guest orders lack anonymous access protection
-- Drop existing SELECT policies on orders table and replace with unified secure policy

DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admin view all orders" ON public.orders;
DROP POLICY IF EXISTS "Manager view orders" ON public.orders;

-- Create unified secure policy that explicitly requires authentication
CREATE POLICY "Secure order viewing" ON public.orders
FOR SELECT
USING (
  -- Admins can view all orders
  has_role(auth.uid(), 'admin')
  OR
  -- Managers can view all orders
  has_role(auth.uid(), 'manager')
  OR
  -- Authenticated users can only view their own orders (not guest orders)
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- Fix order_items table as well - drop and recreate SELECT policy
DROP POLICY IF EXISTS "Users view own order items" ON public.order_items;

-- Create secure policy for order_items
CREATE POLICY "Secure order items viewing" ON public.order_items
FOR SELECT
USING (
  -- Admins can view all order items
  has_role(auth.uid(), 'admin')
  OR
  -- Managers can view all order items (for reporting)
  has_role(auth.uid(), 'manager')
  OR
  -- Authenticated users can view items from their own orders only
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ))
);