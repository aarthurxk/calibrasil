-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view active categories
CREATE POLICY "Anyone can view active categories"
ON public.categories
FOR SELECT
USING (is_active = true);

-- Admins can manage all categories
CREATE POLICY "Admin manage categories"
ON public.categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default e-commerce categories
INSERT INTO public.categories (name, slug, icon, display_order) VALUES
('Capinhas', 'capinhas', 'Smartphone', 1),
('Acessórios', 'acessorios', 'Headphones', 2),
('Carregadores', 'carregadores', 'Battery', 3),
('Cabos', 'cabos', 'Cable', 4),
('Proteção', 'protecao', 'Shield', 5),
('Suportes', 'suportes', 'Monitor', 6),
('Fones', 'fones', 'Headphones', 7),
('Smartwatch', 'smartwatch', 'Watch', 8);