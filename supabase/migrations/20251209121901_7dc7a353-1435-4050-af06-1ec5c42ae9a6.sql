-- Permitir Manager gerenciar produtos
CREATE POLICY "Manager manage products"
ON public.products
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

-- Criar bucket para imagens de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para Admin
CREATE POLICY "Admin can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Políticas de storage para Manager
CREATE POLICY "Manager can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Manager can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Manager can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- Qualquer pessoa pode ver imagens de produtos (bucket público)
CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');