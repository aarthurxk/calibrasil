-- Add review_email_sent column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS review_email_sent BOOLEAN DEFAULT false;

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin manage email templates" ON public.email_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Manager view email templates" ON public.email_templates
  FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial templates
INSERT INTO public.email_templates (template_key, name, subject, html_content, variables) VALUES
(
  'order_confirmation',
  'Confirmação de Pedido (Cliente)',
  '🎉 Pedido Confirmado! #{{order_id}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;margin:0;padding:20px}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}.header{background:linear-gradient(135deg,#0d9488,#14b8a6);padding:30px;text-align:center;color:#fff}.content{padding:30px}.footer{background:#f8f8f8;padding:20px;text-align:center;color:#666;font-size:12px}.btn{display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;margin:10px 0}.item{display:flex;padding:15px 0;border-bottom:1px solid #eee}.item-img{width:80px;height:80px;object-fit:cover;border-radius:8px;margin-right:15px}.item-info{flex:1}.total{font-size:24px;font-weight:bold;color:#0d9488}</style></head><body><div class="container"><div class="header"><h1>🎉 Pedido Confirmado!</h1><p>Obrigado por comprar com a Cali!</p></div><div class="content"><p>Olá, <strong>{{customer_name}}</strong>!</p><p>Seu pedido <strong>#{{order_id}}</strong> foi confirmado e já está sendo preparado.</p><h3>📦 Itens do Pedido</h3>{{items_html}}<hr><p class="total">Total: {{total}}</p><h3>📍 Endereço de Entrega</h3><p>{{shipping_address}}</p><p>Prazo estimado: <strong>{{delivery_days}}</strong></p></div><div class="footer"><p>Cali Brasil - Beach Tech Style 🌴</p><p>Dúvidas? Fale com a gente: oi@calibrasil.com</p></div></div></body></html>',
  '["customer_name", "order_id", "items_html", "total", "shipping_address", "delivery_days"]'::jsonb
),
(
  'seller_notification',
  'Alerta de Venda (Vendedor)',
  '💰 Nova Venda! {{total}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;margin:0;padding:20px}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}.header{background:linear-gradient(135deg,#059669,#10b981);padding:30px;text-align:center;color:#fff}.content{padding:30px}.footer{background:#f8f8f8;padding:20px;text-align:center;color:#666;font-size:12px}.total{font-size:28px;font-weight:bold;color:#059669}</style></head><body><div class="container"><div class="header"><h1>💰 Nova Venda!</h1></div><div class="content"><p class="total">{{total}}</p><h3>👤 Cliente</h3><p><strong>{{customer_name}}</strong><br>{{customer_email}}<br>{{customer_phone}}</p><h3>📦 Pedido #{{order_id}}</h3>{{items_html}}<h3>📍 Entregar em</h3><p>{{shipping_address}}</p><p><strong>Método:</strong> {{payment_method}}</p></div><div class="footer"><p>Painel Admin: calibrasil.com/admin/orders</p></div></div></body></html>',
  '["customer_name", "customer_email", "customer_phone", "order_id", "items_html", "total", "shipping_address", "payment_method"]'::jsonb
),
(
  'order_status_update',
  'Atualização de Status',
  '{{status_emoji}} Seu pedido está {{status_label}}!',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;margin:0;padding:20px}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}.header{background:linear-gradient(135deg,{{status_color}},{{status_color_light}});padding:30px;text-align:center;color:#fff}.content{padding:30px}.footer{background:#f8f8f8;padding:20px;text-align:center;color:#666;font-size:12px}.btn{display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px}</style></head><body><div class="container"><div class="header"><h1>{{status_emoji}} {{status_label}}</h1></div><div class="content"><p>Olá, <strong>{{customer_name}}</strong>!</p><p>{{status_message}}</p><p><strong>Pedido:</strong> #{{order_id}}</p>{{tracking_section}}{{confirmation_section}}{{review_section}}</div><div class="footer"><p>Cali Brasil - Beach Tech Style 🌴</p></div></div></body></html>',
  '["customer_name", "order_id", "status_emoji", "status_label", "status_message", "status_color", "status_color_light", "tracking_section", "confirmation_section", "review_section"]'::jsonb
),
(
  'abandoned_cart',
  'Carrinho Abandonado',
  '🛒 Ei, esqueceu algo no carrinho?',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;margin:0;padding:20px}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}.header{background:linear-gradient(135deg,#f59e0b,#fbbf24);padding:30px;text-align:center;color:#fff}.content{padding:30px}.footer{background:#f8f8f8;padding:20px;text-align:center;color:#666;font-size:12px}.btn{display:inline-block;background:#0d9488;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold}.total{font-size:24px;font-weight:bold;color:#0d9488}</style></head><body><div class="container"><div class="header"><h1>🛒 Esqueceu algo?</h1></div><div class="content"><p>Olá!</p><p>Você deixou alguns produtos incríveis no seu carrinho. Eles ainda estão esperando por você!</p><h3>📦 Seus Produtos</h3>{{items_html}}<hr><p class="total">Total: {{total}}</p><p style="text-align:center;margin-top:30px"><a href="{{cart_url}}" class="btn">Finalizar Compra 🌴</a></p></div><div class="footer"><p>Cali Brasil - Beach Tech Style 🌴</p></div></div></body></html>',
  '["items_html", "total", "cart_url"]'::jsonb
),
(
  'low_stock_alert',
  'Alerta de Estoque Baixo',
  '⚠️ Alerta: {{items_count}} produto(s) com estoque baixo',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;margin:0;padding:20px}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}.header{background:linear-gradient(135deg,#dc2626,#ef4444);padding:30px;text-align:center;color:#fff}.content{padding:30px}.footer{background:#f8f8f8;padding:20px;text-align:center;color:#666;font-size:12px}.item{padding:15px;border-left:4px solid #dc2626;background:#fef2f2;margin:10px 0;border-radius:0 8px 8px 0}.critical{border-color:#dc2626;background:#fef2f2}.warning{border-color:#f59e0b;background:#fffbeb}.btn{display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px}</style></head><body><div class="container"><div class="header"><h1>⚠️ Estoque Baixo</h1><p>{{items_count}} produto(s) precisam de atenção</p></div><div class="content">{{items_html}}<p style="text-align:center;margin-top:30px"><a href="{{admin_url}}" class="btn">Gerenciar Estoque</a></p></div><div class="footer"><p>Sistema Cali Brasil</p></div></div></body></html>',
  '["items_count", "items_html", "admin_url"]'::jsonb
),
(
  'review_request',
  'Solicitação de Avaliação',
  '⭐ Conta pra gente o que achou!',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f5f5;margin:0;padding:20px}.container{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}.header{background:linear-gradient(135deg,#0d9488,#14b8a6);padding:30px;text-align:center;color:#fff}.content{padding:30px}.footer{background:#f8f8f8;padding:20px;text-align:center;color:#666;font-size:12px}.product{display:flex;align-items:center;padding:20px;border:1px solid #eee;border-radius:12px;margin:15px 0}.product-img{width:100px;height:100px;object-fit:cover;border-radius:8px;margin-right:20px}.product-info{flex:1}.btn{display:inline-block;background:#f59e0b;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold}</style></head><body><div class="container"><div class="header"><h1>⭐ Conta pra gente!</h1><p>Sua opinião é muito importante</p></div><div class="content"><p>Olá, <strong>{{customer_name}}</strong>!</p><p>Faz 1 dia que você recebeu seu pedido <strong>#{{order_id}}</strong>. Adoraríamos saber o que achou dos produtos!</p><p>Sua avaliação ajuda outros clientes a escolherem e nos ajuda a melhorar sempre. 🌴</p><h3>📦 Avalie seus produtos</h3>{{products_html}}</div><div class="footer"><p>Cali Brasil - Beach Tech Style 🌴</p><p>Obrigado por fazer parte da nossa tribo!</p></div></div></body></html>',
  '["customer_name", "order_id", "products_html"]'::jsonb
)
ON CONFLICT (template_key) DO NOTHING;