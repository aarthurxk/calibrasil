-- Drop the security definer view that was flagged
DROP VIEW IF EXISTS public.store_public_info;

-- Instead, add a simpler approach: create an edge function or use hardcoded currency
-- The currency is already hardcoded in the frontend as 'BRL', so no public view needed