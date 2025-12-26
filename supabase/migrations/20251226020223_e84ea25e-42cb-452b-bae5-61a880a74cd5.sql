-- Create table for order confirmation tokens
CREATE TABLE public.order_confirm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE public.order_confirm_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can manage tokens (no public access)
CREATE POLICY "Service role manages tokens"
ON public.order_confirm_tokens
FOR ALL
USING (false)
WITH CHECK (false);

-- Create index for faster lookups
CREATE INDEX idx_order_confirm_tokens_order_id ON public.order_confirm_tokens(order_id);

-- Function to create a confirmation token (returns the raw token, stores hash)
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
  -- Generate a random token
  raw_token := encode(gen_random_bytes(32), 'hex');
  
  -- Hash it for storage
  hashed_token := encode(sha256(raw_token::bytea), 'hex');
  
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

-- Function to validate and use a token
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
  -- Hash the input token
  hashed_input := encode(sha256(p_token::bytea), 'hex');
  
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