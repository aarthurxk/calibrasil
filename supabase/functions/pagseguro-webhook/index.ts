import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAGSEGURO-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Webhook received');

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalApiSecret = Deno.env.get("INTERNAL_API_SECRET")!;
    const pagseguroToken = Deno.env.get("PAGSEGURO_TOKEN")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // PagSeguro sends notification via POST with notificationCode or as JSON
    const contentType = req.headers.get("content-type") || "";
    let notificationCode: string | null = null;
    let chargeData: any = null;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Legacy IPN format
      const formData = await req.formData();
      notificationCode = formData.get("notificationCode") as string;
      logStep('Received IPN notification', { notificationCode });
    } else {
      // New webhook format (JSON)
      const body = await req.json();
      logStep('Received webhook payload', { chargeId: body.id, reference: body.reference_id });
      
      // Handle charge webhook
      if (body.charges && body.charges.length > 0) {
        chargeData = body.charges[0];
      } else if (body.id) {
        chargeData = body;
      }
      
      // SECURITY: Verify the charge with PagSeguro API before trusting the webhook
      if (chargeData && chargeData.id) {
        logStep('Verifying charge with PagSeguro API', { chargeId: chargeData.id });
        
        const verifyUrl = `https://api.pagseguro.com/charges/${chargeData.id}`;
        const verifyResponse = await fetch(verifyUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${pagseguroToken}`,
            'Content-Type': 'application/json',
            'x-api-version': '4.0'
          }
        });
        
        if (!verifyResponse.ok) {
          const errorText = await verifyResponse.text();
          logStep('Failed to verify charge with PagSeguro', { status: verifyResponse.status, error: errorText });
          throw new Error(`Failed to verify charge with PagSeguro: ${verifyResponse.status}`);
        }
        
        const verifiedCharge = await verifyResponse.json();
        logStep('Charge verified with PagSeguro', { status: verifiedCharge.status, reference: verifiedCharge.reference_id });
        
        // Use the verified data instead of the webhook payload
        chargeData = verifiedCharge;
      }
    }

    let transactionStatus: string;
    let orderId: string;

    if (notificationCode) {
      // Query PagSeguro for transaction details using legacy API
      const notificationUrl = `https://ws.pagseguro.uol.com.br/v3/transactions/notifications/${notificationCode}?email=${Deno.env.get("PAGSEGURO_EMAIL")}&token=${pagseguroToken}`;
      
      const notificationResponse = await fetch(notificationUrl);
      const notificationText = await notificationResponse.text();
      logStep('Notification response', { text: notificationText });

      // Parse XML response (simplified parsing)
      const statusMatch = notificationText.match(/<status>(\d+)<\/status>/);
      const referenceMatch = notificationText.match(/<reference>([^<]+)<\/reference>/);
      
      if (!statusMatch || !referenceMatch) {
        throw new Error("Could not parse notification response");
      }

      transactionStatus = statusMatch[1];
      orderId = referenceMatch[1];
    } else if (chargeData) {
      // Handle new webhook format
      transactionStatus = chargeData.status;
      orderId = chargeData.reference_id;
      
      // Map new status format
      const statusMap: Record<string, string> = {
        'AUTHORIZED': '1',
        'PAID': '3',
        'AVAILABLE': '4',
        'IN_DISPUTE': '5',
        'REFUNDED': '6',
        'CANCELED': '7',
        'DECLINED': '7'
      };
      
      transactionStatus = statusMap[transactionStatus] || transactionStatus;
    } else {
      throw new Error("No notification data received");
    }

    logStep('Processing transaction', { orderId, status: transactionStatus });

    // Fetch order to verify it's a PagSeguro order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      logStep('Order not found', { orderId, error: orderError });
      throw new Error(`Order not found: ${orderId}`);
    }

    if (order.payment_gateway !== 'pagseguro') {
      logStep('Order is not a PagSeguro order', { gateway: order.payment_gateway });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // Map PagSeguro status to our status
    // 1 = Aguardando pagamento
    // 2 = Em análise
    // 3 = Paga
    // 4 = Disponível
    // 5 = Em disputa
    // 6 = Devolvida
    // 7 = Cancelada
    // 8 = Debitado (chargeback)
    // 9 = Em contestação

    let newPaymentStatus: string;
    let newOrderStatus: string;
    let shouldSendEmails = false;

    switch (transactionStatus) {
      case '1':
      case '2':
        newPaymentStatus = 'awaiting_payment';
        newOrderStatus = 'awaiting_payment';
        break;
      case '3':
      case '4':
        newPaymentStatus = 'paid';
        newOrderStatus = 'processing';
        shouldSendEmails = order.payment_status !== 'paid'; // Only send if not already paid
        break;
      case '6':
      case '7':
      case '8':
        newPaymentStatus = 'cancelled';
        newOrderStatus = 'cancelled';
        break;
      case '5':
      case '9':
        newPaymentStatus = 'disputed';
        newOrderStatus = 'processing';
        break;
      default:
        newPaymentStatus = 'pending';
        newOrderStatus = 'pending';
    }

    logStep('Updating order status', { orderId, newPaymentStatus, newOrderStatus });

    // Update order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: newPaymentStatus,
        status: newOrderStatus
      })
      .eq('id', orderId);

    if (updateError) {
      logStep('Error updating order', { error: updateError });
      throw new Error("Failed to update order");
    }

    // Send confirmation emails if payment confirmed
    if (shouldSendEmails) {
      logStep('Triggering confirmation emails');
      
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-order-emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': internalApiSecret
          },
          body: JSON.stringify({ orderId })
        });
        
        const emailResult = await emailResponse.json();
        logStep('Email trigger result', { result: emailResult });
      } catch (emailError) {
        logStep('Error triggering emails', { error: emailError });
        // Don't fail webhook for email errors
      }

      // Update coupon usage if applicable
      if (order.coupon_code) {
        const { data: couponData } = await supabase
          .from('coupons')
          .select('used_count')
          .eq('code', order.coupon_code)
          .single();
        
        if (couponData) {
          await supabase
            .from('coupons')
            .update({ used_count: (couponData.used_count || 0) + 1 })
            .eq('code', order.coupon_code);
          
          logStep('Coupon usage updated', { code: order.coupon_code });
        }
      }

      // Check for low stock and send alerts
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);

      if (orderItems) {
        for (const item of orderItems) {
          if (!item.product_id) continue;

          // Update stock
          const { data: variants } = await supabase
            .from('product_variants')
            .select('id, stock_quantity')
            .eq('product_id', item.product_id);

          if (variants && variants.length > 0) {
            const variant = variants[0];
            const newStock = Math.max(0, variant.stock_quantity - item.quantity);
            
            await supabase
              .from('product_variants')
              .update({ stock_quantity: newStock })
              .eq('id', variant.id);

            // Check if low stock alert needed
            if (newStock <= 5) {
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-low-stock-email`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-internal-secret': internalApiSecret
                  },
                  body: JSON.stringify({ productId: item.product_id, currentStock: newStock })
                });
              } catch (e) {
                logStep('Error sending low stock email', { error: e });
              }
            }
          }
        }
      }
    }

    logStep('Webhook processed successfully', { orderId, newStatus: newPaymentStatus });

    return new Response(
      JSON.stringify({ received: true, orderId, status: newPaymentStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
