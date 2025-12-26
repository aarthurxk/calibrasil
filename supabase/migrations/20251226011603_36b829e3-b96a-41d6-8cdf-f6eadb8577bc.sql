-- Adicionar campo codigo_produto na tabela products
ALTER TABLE public.products 
ADD COLUMN codigo_produto TEXT;

-- Adicionar constraint UNIQUE para garantir unicidade
ALTER TABLE public.products 
ADD CONSTRAINT products_codigo_produto_unique UNIQUE (codigo_produto);

-- Criar índice para buscas por código
CREATE INDEX idx_products_codigo_produto ON public.products (codigo_produto);

-- Adicionar campo codigo_variacao na tabela product_variants
ALTER TABLE public.product_variants 
ADD COLUMN codigo_variacao TEXT;

-- Adicionar constraint UNIQUE para garantir unicidade (opcional)
ALTER TABLE public.product_variants 
ADD CONSTRAINT product_variants_codigo_variacao_unique UNIQUE (codigo_variacao);

-- Criar índice para buscas por código da variação
CREATE INDEX idx_product_variants_codigo_variacao ON public.product_variants (codigo_variacao);

-- Função para gerar próximo código de produto
CREATE OR REPLACE FUNCTION public.generate_next_product_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_code TEXT;
  next_num INTEGER;
BEGIN
  -- Buscar o maior código existente no formato C-XXX
  SELECT codigo_produto INTO max_code
  FROM products
  WHERE codigo_produto ~ '^C-[0-9]+$'
  ORDER BY CAST(SUBSTRING(codigo_produto FROM 3) AS INTEGER) DESC
  LIMIT 1;
  
  IF max_code IS NULL THEN
    next_num := 1;
  ELSE
    next_num := CAST(SUBSTRING(max_code FROM 3) AS INTEGER) + 1;
  END IF;
  
  RETURN 'C-' || LPAD(next_num::TEXT, 3, '0');
END;
$$;

-- Função para gerar próximo código de variação baseado no produto
CREATE OR REPLACE FUNCTION public.generate_next_variant_code(p_product_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_suffix INTEGER;
  base_code TEXT;
BEGIN
  -- Usar código do produto como base
  base_code := COALESCE(p_product_code, 'C-000');
  
  -- Buscar maior sufixo existente para este produto
  SELECT MAX(CAST(SUBSTRING(codigo_variacao FROM LENGTH(base_code) + 2) AS INTEGER))
  INTO max_suffix
  FROM product_variants
  WHERE codigo_variacao LIKE base_code || '-%';
  
  IF max_suffix IS NULL THEN
    max_suffix := 0;
  END IF;
  
  RETURN base_code || '-' || LPAD((max_suffix + 1)::TEXT, 2, '0');
END;
$$;

-- Função para validar formato do código de produto
CREATE OR REPLACE FUNCTION public.validate_product_code(code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- Aceita formato C-XXX (ex: C-001) ou apenas XXX (ex: 001)
  IF code IS NULL OR code = '' THEN
    RETURN TRUE; -- Permite vazio (será gerado automaticamente)
  END IF;
  
  RETURN code ~ '^(C-)?[0-9]{1,5}$';
END;
$$;