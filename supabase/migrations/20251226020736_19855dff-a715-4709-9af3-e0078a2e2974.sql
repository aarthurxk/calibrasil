-- Fix the functions to use correct pgcrypto function calls
CREATE OR REPLACE FUNCTION public.create_order_confirm_token(p_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_token text;
  hashed_token text;
BEGIN
  -- Generate a random token using gen_random_bytes (from pgcrypto or pg14+)
  raw_token := encode(gen_random_bytes(32), 'hex');
  
  -- Hash it for storage using digest from pgcrypto
  hashed_token := encode(digest(raw_token::bytea, 'sha256'), 'hex');
  
  -- Insert or update (upsert)
  INSERT INTO order_confirm_tokens (order_id, token_hash, expires_at)
  VALUES (p_order_id, hashed_token, now() + interval '7 days')
  ON CONFLICT (order_id) DO UPDATE SET
    token_hash = hashed_token,
    expires_at = now() + interval '7 days',
    used_at = NULL,
    created_at = now();
  
  RETURN raw_token;
END;
$$;

-- Update the validation function
CREATE OR REPLACE FUNCTION public.validate_order_confirm_token(p_order_id uuid, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_record record;
  hashed_input text;
BEGIN
  -- Hash the input token using digest from pgcrypto
  hashed_input := encode(digest(p_token::bytea, 'sha256'), 'hex');
  
  -- Find the token
  SELECT * INTO token_record
  FROM order_confirm_tokens
  WHERE order_id = p_order_id;
  
  -- Check if token exists
  IF token_record IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'token_not_found');
  END IF;
  
  -- Check if already used
  IF token_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'token_already_used');
  END IF;
  
  -- Check if expired
  IF token_record.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'token_expired');
  END IF;
  
  -- Check if hash matches
  IF token_record.token_hash != hashed_input THEN
    RETURN jsonb_build_object('valid', false, 'error', 'token_invalid');
  END IF;
  
  -- Mark as used
  UPDATE order_confirm_tokens
  SET used_at = now()
  WHERE order_id = p_order_id;
  
  -- Update order status
  UPDATE orders
  SET status = 'delivered', received_at = now()
  WHERE id = p_order_id;
  
  -- Log to audit
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (NULL, 'confirm_received', 'order', p_order_id::text, 
    jsonb_build_object('source', 'email_token', 'confirmed_at', now()));
  
  RETURN jsonb_build_object('valid', true);
END;
$$;