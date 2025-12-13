-- Inserir template de notificação de código de rastreamento
INSERT INTO public.email_templates (template_key, name, subject, html_content, variables, is_active)
VALUES (
  'tracking_code_notification',
  'Notificação de Código de Rastreamento',
  '📦 Seu pedido foi enviado! Rastreie: {{tracking_code}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #059669; margin: 0;">📦 Seu Pedido Foi Enviado!</h1>
  </div>
  
  <p>Olá <strong>{{customer_name}}</strong>,</p>
  
  <p>Ótimas notícias! Seu pedido <strong>#{{order_id}}</strong> está a caminho! 🎉</p>
  
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0;">
    <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">Código de Rastreamento</p>
    <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">{{tracking_code}}</p>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{tracking_url}}" style="display: inline-block; background-color: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 5px;">🔍 Rastrear Pedido</a>
  </div>
  
  <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #059669;">
    <p style="margin: 0 0 10px 0;"><strong>📍 Como rastrear:</strong></p>
    <ol style="margin: 0; padding-left: 20px;">
      <li>Acesse o site dos Correios ou da transportadora</li>
      <li>Insira o código: <strong>{{tracking_code}}</strong></li>
      <li>Acompanhe cada etapa da entrega</li>
    </ol>
  </div>
  
  <p>Quando receber seu pedido, não esqueça de confirmar o recebimento clicando no botão abaixo:</p>
  
  <div style="text-align: center; margin: 25px 0;">
    <a href="{{confirmation_url}}" style="display: inline-block; background-color: #0891b2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">✅ Confirmar Recebimento</a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #6b7280; font-size: 14px; text-align: center;">
    Qualquer dúvida, estamos aqui! 💚<br>
    <strong>Equipe Cali Brasil</strong>
  </p>
</body>
</html>',
  '["customer_name", "order_id", "tracking_code", "tracking_url", "confirmation_url"]'::jsonb,
  true
);