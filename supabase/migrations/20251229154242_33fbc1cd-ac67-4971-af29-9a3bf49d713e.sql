-- Add moderation fields to product_reviews table
ALTER TABLE public.product_reviews 
ADD COLUMN IF NOT EXISTS approved boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS admin_edited boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_comment text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_review_updated_at();

-- Add RLS policy for admin to manage all reviews
CREATE POLICY "Admin manage all reviews"
ON public.product_reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for manager to view all reviews
CREATE POLICY "Manager view all reviews"
ON public.product_reviews
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Update existing "Anyone can view reviews" policy to only show approved reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.product_reviews;

CREATE POLICY "Anyone can view approved reviews"
ON public.product_reviews
FOR SELECT
USING (approved = true);