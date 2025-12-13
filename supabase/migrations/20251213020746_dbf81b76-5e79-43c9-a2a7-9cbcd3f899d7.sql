-- Create coupons table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent NUMERIC NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  min_purchase NUMERIC DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin manage coupons" ON public.coupons
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Manager can view all coupons
CREATE POLICY "Manager view coupons" ON public.coupons
FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));

-- Manager can create coupons up to 40%
CREATE POLICY "Manager create coupons up to 40 percent" ON public.coupons
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) AND discount_percent <= 40
);

-- Manager can update coupons up to 40%
CREATE POLICY "Manager update coupons up to 40 percent" ON public.coupons
FOR UPDATE USING (
  has_role(auth.uid(), 'manager'::app_role) AND discount_percent <= 40
);

-- Manager can delete coupons they created with up to 40%
CREATE POLICY "Manager delete own coupons" ON public.coupons
FOR DELETE USING (
  has_role(auth.uid(), 'manager'::app_role) AND discount_percent <= 40
);

-- Add coupon_code to orders table to track which coupon was used
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- Trigger for updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();