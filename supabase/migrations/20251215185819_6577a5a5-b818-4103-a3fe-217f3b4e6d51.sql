-- Create sellers table for physical store salespeople
CREATE TABLE public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC DEFAULT 0,
  commission_percent NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  total_sales NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add seller tracking columns to orders table
ALTER TABLE public.orders ADD COLUMN seller_code TEXT;
ALTER TABLE public.orders ADD COLUMN seller_discount_amount NUMERIC DEFAULT 0;

-- Enable RLS on sellers table
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sellers
CREATE POLICY "Admin manage sellers"
ON public.sellers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Manager view sellers"
ON public.sellers
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Public can validate seller codes (for checkout)
CREATE POLICY "Anyone can validate active sellers"
ON public.sellers
FOR SELECT
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_sellers_updated_at
BEFORE UPDATE ON public.sellers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();