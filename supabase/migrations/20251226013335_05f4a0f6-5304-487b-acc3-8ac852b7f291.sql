-- =====================================================
-- SEGURANÇA: Políticas de Storage para product-images
-- =====================================================

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload access" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete access" ON storage.objects;

-- Leitura pública para catálogo (bucket é público)
CREATE POLICY "Public read product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Upload apenas para Admin e Manager
CREATE POLICY "Admin Manager upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Update apenas para Admin e Manager
CREATE POLICY "Admin Manager update product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Delete apenas para Admin
CREATE POLICY "Admin delete product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);