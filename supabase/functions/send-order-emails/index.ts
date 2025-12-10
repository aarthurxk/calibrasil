import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  total: number;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
}

const formatPrice = (price: number): string => {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPaymentMethod = (method: string): string => {
  const methods: Record<string, string> = {
    card: 'Cartão de Crédito/Débito',
    pix: 'Pix',
    boleto: 'Boleto Bancário',
  };
  return methods[method] || method;
};

const generateItemsHtml = (items: OrderItem[]): string => {
  return items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.product_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
    </tr>
  `).join('');
};

const generateBuyerEmail = (data: OrderEmailRequest): string => {
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

      <h2 style="color: #333; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">Endereço de Entrega</h2>
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 5px 0;"><strong>${data.shippingAddress.name}</strong></p>
        <p style="margin: 0 0 5px 0;">${data.shippingAddress.street}, ${data.shippingAddress.number}${data.shippingAddress.complement ? ` - ${data.shippingAddress.complement}` : ''}</p>
        <p style="margin: 0 0 5px 0;">${data.shippingAddress.neighborhood}</p>
        <p style="margin: 0 0 5px 0;">${data.shippingAddress.city} - ${data.shippingAddress.state}</p>
        <p style="margin: 0;">CEP: ${data.shippingAddress.zipCode}</p>
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

const generateSellerEmail = (data: OrderEmailRequest): string => {
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
        <p style="margin: 0 0 10px 0;"><strong>Nome:</strong> ${data.customerName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${data.customerEmail}</p>
        ${data.customerPhone ? `<p style="margin: 0;"><strong>Telefone:</strong> ${data.customerPhone}</p>` : ''}
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
        <p style="margin: 0 0 5px 0;"><strong>${data.shippingAddress.name}</strong></p>
        <p style="margin: 0 0 5px 0;">${data.shippingAddress.street}, ${data.shippingAddress.number}${data.shippingAddress.complement ? ` - ${data.shippingAddress.complement}` : ''}</p>
        <p style="margin: 0 0 5px 0;">${data.shippingAddress.neighborhood}</p>
        <p style="margin: 0 0 5px 0;">${data.shippingAddress.city} - ${data.shippingAddress.state}</p>
        <p style="margin: 0;">CEP: ${data.shippingAddress.zipCode}</p>
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
    const data: OrderEmailRequest = await req.json();
    console.log("[SEND-ORDER-EMAILS] Received request for order:", data.orderId);

    // Send email to buyer
    console.log("[SEND-ORDER-EMAILS] Sending confirmation email to:", data.customerEmail);
    const buyerEmailResult = await resend.emails.send({
      from: "Cali Brasil <pedidos@calibrasil.com>",
      to: [data.customerEmail],
      subject: `Pedido confirmado! 🎉 #${data.orderId.substring(0, 8).toUpperCase()}`,
      html: generateBuyerEmail(data),
    });
    console.log("[SEND-ORDER-EMAILS] Buyer email result:", buyerEmailResult);

    // Send email to seller
    console.log("[SEND-ORDER-EMAILS] Sending sales alert to: arthur@calibrasil.com");
    const sellerEmailResult = await resend.emails.send({
      from: "Cali Brasil <pedidos@calibrasil.com>",
      to: ["arthur@calibrasil.com"],
      subject: `Nova venda! 💰 ${formatPrice(data.total)}`,
      html: generateSellerEmail(data),
    });
    console.log("[SEND-ORDER-EMAILS] Seller email result:", sellerEmailResult);

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
