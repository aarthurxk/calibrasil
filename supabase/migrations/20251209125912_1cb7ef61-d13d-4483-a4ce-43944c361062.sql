-- Promote user to admin
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = 'ce3c515f-1307-4616-ae80-6765e6798d5c';

-- Expand products table with new fields
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS sizes TEXT[],
ADD COLUMN IF NOT EXISTS images TEXT[];