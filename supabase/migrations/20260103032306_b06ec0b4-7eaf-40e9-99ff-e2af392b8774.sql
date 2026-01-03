-- ✅ Adicionar colunas na tabela orders (se não existirem)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS label_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS label_generated_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS label_pdf_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sigep_etiqueta VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_weight DECIMAL(10,3);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS declared_value DECIMAL(10,2);

-- ✅ Criar tabela para histórico de etiquetas
CREATE TABLE IF NOT EXISTS shipping_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  tracking_code VARCHAR(20) NOT NULL,
  label_number VARCHAR(20) NOT NULL,
  service_type VARCHAR(20) NOT NULL,
  weight DECIMAL(10,3),
  declared_value DECIMAL(10,2),
  pdf_url TEXT,
  xml_request TEXT,
  xml_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ✅ Habilitar RLS
ALTER TABLE shipping_labels ENABLE ROW LEVEL SECURITY;

-- ✅ Políticas RLS
CREATE POLICY "Admin manage shipping_labels" ON shipping_labels
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Manager view shipping_labels" ON shipping_labels
  FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));

-- ✅ Índices para performance
CREATE INDEX IF NOT EXISTS idx_shipping_labels_order ON shipping_labels(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_labels_tracking ON shipping_labels(tracking_code);
CREATE INDEX IF NOT EXISTS idx_orders_label_generated ON orders(label_generated);