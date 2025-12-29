-- Fix handle_new_user() to remove automatic guest order linking
-- Guest orders should only be claimed through an explicit, verified flow

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Criar perfil do usuário
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Criar role de customer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  -- REMOVED: Automatic guest order linking removed for security
  -- Previously, this would auto-link guest orders by email without verification
  -- This was a security risk: an attacker could register with someone else's email
  -- and gain access to their order history
  -- 
  -- If you want to implement guest order claiming, do it through a separate
  -- verified flow that requires the user to confirm order details (e.g., order ID + email)
  
  RETURN NEW;
END;
$function$;