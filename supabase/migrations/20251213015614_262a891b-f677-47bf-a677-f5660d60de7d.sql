-- Create roadmap_items table
CREATE TABLE public.roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  version TEXT DEFAULT 'v1.0',
  status TEXT DEFAULT 'planned',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

-- Admin can manage all roadmap items
CREATE POLICY "Admin manage roadmap" ON public.roadmap_items
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Manager can view roadmap items
CREATE POLICY "Manager view roadmap" ON public.roadmap_items
FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_roadmap_items_updated_at
BEFORE UPDATE ON public.roadmap_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();