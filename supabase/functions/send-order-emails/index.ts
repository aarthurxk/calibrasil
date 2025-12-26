import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
}

interface ShippingAddress {
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

interface OrderEmailRequest {
  orderId: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  items?: OrderItem[];
  total?: number;
  shippingAddress?: ShippingAddress;
  paymentMethod?: string;
  deliveryMinDays?: number;
  deliveryMaxDays?: number;
}

const formatPrice = (price: number): string => {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPaymentMethod = (method: string): string => {
  const methods: Record<string, string> = {
    card: 'Cartão de Crédito/Débito',
    pix: 'Pix',
    boleto: 'Boleto Bancário',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
  };
  return methods[method] || method;
};

const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const generateItemsHtml = (items: OrderItem[]): string => {
  if (!items || items.length === 0) {
    return '<tr><td colspan="4" style="padding: 12px; text-align: center;">Nenhum item encontrado</td></tr>';
  }
  return items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${escapeHtml(item.product_name)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
    </tr>
  `).join('');
};

const generateBuyerEmail = (data: { orderId: string; customerName: string; items: OrderItem[]; total: number; shippingAddress: ShippingAddress; paymentMethod: string; deliveryMinDays: number; deliveryMaxDays: number }): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #16a34a; margin: 0;">🎉 Pedido Confirmado!</h1>
        <p style="color: #666; margin-top: 10px;">Obrigado por comprar na Cali Brasil</p>
      </div>
      
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0;"><strong>Número do Pedido:</strong> #${data.orderId.substring(0, 8).toUpperCase()}</p>
        <p style="margin: 0;"><strong>Forma de Pagamento:</strong> ${formatPaymentMethod(data.paymentMethod)}</p>
      </div>

      <h2 style="color: #333; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">Produtos</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left;">Produto</th>
            <th style="padding: 12px; text-align: center;">Qtd</th>
            <th style="padding: 12px; text-align: right;">Preço</th>
            <th style="padding: 12px; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${generateItemsHtml(data.items)}
        </tbody>
        <tfoot>
          <tr style="background: #16a34a; color: white;">
            <td colspan="3" style="padding: 12px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 12px; text-align: right;"><strong>${formatPrice(data.total)}</strong></td>
          </tr>
        </tfoot>
      </table>

      <h2 style="color: #333; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">📦 Prazo de Entrega</h2>
      <div style="background: #ecfdf5; border: 1px solid #16a34a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; font-size: 18px;"><strong>Estimativa: ${data.deliveryMinDays} a ${data.deliveryMaxDays} dias úteis</strong></p>
        <p style="margin: 0; color: #666;">Após a confirmação do pagamento, seu pedido será enviado e você receberá o código de rastreamento por e-mail.</p>
      </div>

      <h2 style="color: #333; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">Endereço de Entrega</h2>
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 5px 0;"><strong>${escapeHtml(data.shippingAddress.name)}</strong></p>
        <p style="margin: 0 0 5px 0;">${escapeHtml(data.shippingAddress.street)}, ${escapeHtml(data.shippingAddress.number)}${data.shippingAddress.complement ? ` - ${escapeHtml(data.shippingAddress.complement)}` : ''}</p>
        <p style="margin: 0 0 5px 0;">${escapeHtml(data.shippingAddress.neighborhood)}</p>
        <p style="margin: 0 0 5px 0;">${escapeHtml(data.shippingAddress.city)} - ${escapeHtml(data.shippingAddress.state)}</p>
        <p style="margin: 0;">CEP: ${escapeHtml(data.shippingAddress.zipCode)}</p>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #666; margin: 0;">Dúvidas? Fala com a gente!</p>
        <p style="margin: 10px 0;"><a href="mailto:oi@calibrasil.com" style="color: #16a34a;">oi@calibrasil.com</a></p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">© ${new Date().getFullYear()} Cali Brasil. Todos os direitos reservados.</p>
      </div>
    </body>
    </html>
  `;
};

const generateSellerEmail = (data: { orderId: string; customerName: string; customerEmail: string; customerPhone?: string; items: OrderItem[]; total: number; shippingAddress: ShippingAddress; paymentMethod: string }): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #16a34a; margin: 0;">💰 Nova Venda!</h1>
        <p style="color: #666; margin-top: 10px;">Você tem um novo pedido</p>
      </div>
      
      <div style="background: #dcfce7; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
        <p style="margin: 0; font-size: 24px; color: #16a34a;"><strong>${formatPrice(data.total)}</strong></p>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #333;">Dados do Pedido</h3>
        <p style="margin: 0 0 10px 0;"><strong>Pedido:</strong> #${data.orderId.substring(0, 8).toUpperCase()}</p>
        <p style="margin: 0 0 10px 0;"><strong>Pagamento:</strong> ${formatPaymentMethod(data.paymentMethod)}</p>
        <p style="margin: 0;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #333;">Dados do Cliente</h3>
        <p style="margin: 0 0 10px 0;"><strong>Nome:</strong> ${escapeHtml(data.customerName)}</p>
        <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${escapeHtml(data.customerEmail)}</p>
        ${data.customerPhone ? `<p style="margin: 0;"><strong>Telefone:</strong> ${escapeHtml(data.customerPhone)}</p>` : ''}
      </div>

      <h2 style="color: #333; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">Produtos Vendidos</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left;">Produto</th>
            <th style="padding: 12px; text-align: center;">Qtd</th>
            <th style="padding: 12px; text-align: right;">Preço</th>
            <th style="padding: 12px; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${generateItemsHtml(data.items)}
        </tbody>
        <tfoot>
          <tr style="background: #16a34a; color: white;">
            <td colspan="3" style="padding: 12px; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 12px; text-align: right;"><strong>${formatPrice(data.total)}</strong></td>
          </tr>
        </tfoot>
      </table>

      <h2 style="color: #333; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">Endereço de Entrega</h2>
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px;">
        <p style="margin: 0 0 5px 0;"><strong>${escapeHtml(data.shippingAddress.name)}</strong></p>
        <p style="margin: 0 0 5px 0;">${escapeHtml(data.shippingAddress.street)}, ${escapeHtml(data.shippingAddress.number)}${data.shippingAddress.complement ? ` - ${escapeHtml(data.shippingAddress.complement)}` : ''}</p>
        <p style="margin: 0 0 5px 0;">${escapeHtml(data.shippingAddress.neighborhood)}</p>
        <p style="margin: 0 0 5px 0;">${escapeHtml(data.shippingAddress.city)} - ${escapeHtml(data.shippingAddress.state)}</p>
        <p style="margin: 0;">CEP: ${escapeHtml(data.shippingAddress.zipCode)}</p>
      </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify internal secret to prevent unauthorized access
    const internalSecret = req.headers.get("x-internal-secret");
    const expectedSecret = Deno.env.get("INTERNAL_API_SECRET");
    
    if (!internalSecret || internalSecret !== expectedSecret) {
      console.error("[SEND-ORDER-EMAILS] Unauthorized: Invalid or missing internal secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const requestData: OrderEmailRequest = await req.json();
    console.log("[SEND-ORDER-EMAILS] Processing order:", requestData.orderId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order data from database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', requestData.orderId)
      .single();

    if (orderError || !order) {
      console.error("[SEND-ORDER-EMAILS] Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch order items from database
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_name, quantity, price')
      .eq('order_id', requestData.orderId);

    if (itemsError) {
      console.error("[SEND-ORDER-EMAILS] Error fetching items:", itemsError);
    }

    const items: OrderItem[] = orderItems || [];
    console.log("[SEND-ORDER-EMAILS] Found items:", items.length);

    // Fetch store settings for delivery days
    const { data: storeSettings } = await supabase
      .from('store_settings')
      .select('delivery_min_days, delivery_max_days')
      .limit(1)
      .single();

    // Build email data from database
    const shippingAddress = order.shipping_address as ShippingAddress || {
      name: 'Cliente',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    };

    // Determine customer email (logged-in user or guest)
    const customerEmail = requestData.customerEmail || order.guest_email;
    if (!customerEmail) {
      console.error("[SEND-ORDER-EMAILS] No customer email found");
      return new Response(
        JSON.stringify({ error: "No customer email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailData = {
      orderId: requestData.orderId,
      customerName: requestData.customerName || shippingAddress.name || 'Cliente',
      customerEmail: customerEmail,
      customerPhone: requestData.customerPhone || order.phone,
      items: items,
      total: order.total,
      shippingAddress: shippingAddress,
      paymentMethod: order.payment_method || 'card',
      deliveryMinDays: storeSettings?.delivery_min_days || 5,
      deliveryMaxDays: storeSettings?.delivery_max_days || 10
    };

    console.log("[SEND-ORDER-EMAILS] Email data prepared:", {
      orderId: emailData.orderId,
      itemCount: emailData.items.length,
      total: emailData.total
    });

    // Send email to buyer
    console.log("[SEND-ORDER-EMAILS] Sending buyer confirmation to:", emailData.customerEmail);
    const buyerEmailResult = await resend.emails.send({
      from: "Cali Brasil <pedidos@calibrasil.com>",
      to: [emailData.customerEmail],
      subject: `Pedido confirmado! 🎉 #${emailData.orderId.substring(0, 8).toUpperCase()}`,
      html: generateBuyerEmail(emailData),
    });
    console.log("[SEND-ORDER-EMAILS] Buyer email result:", JSON.stringify(buyerEmailResult));
    
    if (buyerEmailResult.error) {
      console.error("[SEND-ORDER-EMAILS] Resend error for buyer:", JSON.stringify(buyerEmailResult.error));
    }

    // Send email to seller
    console.log("[SEND-ORDER-EMAILS] Sending seller notification to: arthur@calibrasil.com");
    const sellerEmailResult = await resend.emails.send({
      from: "Cali Brasil <pedidos@calibrasil.com>",
      to: ["arthur@calibrasil.com"],
      subject: `Nova venda! 💰 ${formatPrice(emailData.total)}`,
      html: generateSellerEmail(emailData),
    });
    console.log("[SEND-ORDER-EMAILS] Seller email result:", JSON.stringify(sellerEmailResult));
    
    if (sellerEmailResult.error) {
      console.error("[SEND-ORDER-EMAILS] Resend error for seller:", JSON.stringify(sellerEmailResult.error));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        buyerEmail: buyerEmailResult, 
        sellerEmail: sellerEmailResult 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[SEND-ORDER-EMAILS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});