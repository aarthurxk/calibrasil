import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-WEBHOOK] ${step}${detailsStr}`);
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
    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Mercado Pago sends IPN notifications as query params or JSON body
    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const resourceId = url.searchParams.get("id") || url.searchParams.get("data.id");

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // No JSON body, using query params
    }

    const notificationType = topic || body.type || body.action;
    const dataId = resourceId || body.data?.id;

    logStep('Notification received', { type: notificationType, id: dataId, body });

    // IDEMPOTÊNCIA: Verificar se evento já foi processado (usando dataId como event_id)
    if (dataId) {
      const { data: alreadyProcessed } = await supabase.rpc('check_webhook_processed', {
        p_event_id: String(dataId),
        p_provider: 'mercadopago'
      });

      if (alreadyProcessed) {
        logStep('Event already processed, skipping', { id: dataId });
        return new Response(
          JSON.stringify({ received: true, duplicate: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Only process payment notifications
    if (!notificationType || !['payment', 'payment.created', 'payment.updated'].includes(notificationType)) {
      logStep('Ignoring non-payment notification', { type: notificationType });
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    if (!dataId) {
      logStep('No payment ID in notification');
      return new Response(JSON.stringify({ received: true, error: 'No payment ID' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // SECURITY: Verify the payment with Mercado Pago API before trusting the webhook
    logStep('Verifying payment with Mercado Pago API', { paymentId: dataId });
    
    const verifyUrl = `https://api.mercadopago.com/v1/payments/${dataId}`;
    const verifyResponse = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      logStep('Failed to verify payment with Mercado Pago', { status: verifyResponse.status, error: errorText });
      throw new Error(`Failed to verify payment with Mercado Pago: ${verifyResponse.status}`);
    }
    
    const paymentData = await verifyResponse.json();
    logStep('Payment verified with Mercado Pago', { 
      status: paymentData.status, 
      external_reference: paymentData.external_reference,
      status_detail: paymentData.status_detail
    });

    const orderId = paymentData.external_reference;
    const paymentStatus = paymentData.status;
    const paymentMethod = paymentData.payment_type_id;

    if (!orderId) {
      logStep('No order ID (external_reference) in payment');
      return new Response(JSON.stringify({ received: true, error: 'No order reference' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // Fetch order to verify it's a Mercado Pago order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      logStep('Order not found', { orderId, error: orderError });
      throw new Error(`Order not found: ${orderId}`);
    }

    if (order.payment_gateway !== 'mercadopago') {
      logStep('Order is not a Mercado Pago order', { gateway: order.payment_gateway });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // Map Mercado Pago status to our status
    // approved - Payment approved
    // pending - Payment pending (waiting for user action)
    // authorized - Payment authorized but not captured
    // in_process - Payment in review
    // in_mediation - In dispute
    // rejected - Payment rejected
    // cancelled - Payment cancelled
    // refunded - Payment refunded
    // charged_back - Chargeback

    let newPaymentStatus: string;
    let newOrderStatus: string;
    let shouldSendEmails = false;

    switch (paymentStatus) {
      case 'approved':
        newPaymentStatus = 'paid';
        newOrderStatus = 'processing';
        shouldSendEmails = order.payment_status !== 'paid';
        break;
      case 'pending':
      case 'in_process':
      case 'authorized':
        newPaymentStatus = 'awaiting_payment';
        newOrderStatus = 'awaiting_payment';
        break;
      case 'rejected':
      case 'cancelled':
        newPaymentStatus = 'failed';
        newOrderStatus = 'cancelled';
        break;
      case 'refunded':
      case 'charged_back':
        newPaymentStatus = 'refunded';
        newOrderStatus = 'cancelled';
        break;
      case 'in_mediation':
        newPaymentStatus = 'disputed';
        newOrderStatus = 'processing';
        break;
      default:
        newPaymentStatus = 'pending';
        newOrderStatus = 'pending';
    }

    logStep('Updating order status', { orderId, newPaymentStatus, newOrderStatus, paymentMethod });

    // Update order with payment info
    const updateData: any = {
      payment_status: newPaymentStatus,
      status: newOrderStatus,
      mercadopago_payment_id: String(dataId)
    };

    // Map payment method
    if (paymentMethod) {
      const methodMap: Record<string, string> = {
        'credit_card': 'card',
        'debit_card': 'card',
        'pix': 'pix',
        'bank_transfer': 'pix',
        'ticket': 'boleto',
        'atm': 'boleto'
      };
      updateData.payment_method = methodMap[paymentMethod] || paymentMethod;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      logStep('Error updating order', { error: updateError });
      throw new Error("Failed to update order");
    }

    // Send confirmation emails if payment confirmed
    if (shouldSendEmails) {
      logStep('EMAIL_PAYMENT_TRIGGERED', { orderId, hasUserId: !!order.user_id, hasGuestEmail: !!order.guest_email });
      
      try {
        // Determine customer email - either from guest_email or fetch from auth.users
        let customerEmail = order.guest_email;
        let customerName = null;
        
        if (!customerEmail && order.user_id) {
          logStep('Fetching email for logged-in user', { userId: order.user_id });
          
          // Tentativa 1: Buscar email do auth.users
          try {
            const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(order.user_id);
            
            if (authError) {
              logStep('Auth getUserById failed', { error: authError.message });
            } else if (authUser?.user?.email) {
              customerEmail = authUser.user.email;
              customerName = authUser.user.user_metadata?.full_name || null;
              logStep('User email found via auth', { email: customerEmail });
            }
          } catch (authErr) {
            logStep('Auth getUserById exception', { error: String(authErr) });
          }
          
          // Tentativa 2: Buscar na tabela profiles se ainda não temos email
          if (!customerEmail) {
            logStep('Trying fallback: get-user-email function');
            try {
              const emailResponse = await fetch(`${supabaseUrl}/functions/v1/get-user-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({ userId: order.user_id })
              });
              
              if (emailResponse.ok) {
                const emailData = await emailResponse.json();
                if (emailData.email) {
                  customerEmail = emailData.email;
                  customerName = emailData.full_name || null;
                  logStep('User email found via get-user-email', { email: customerEmail });
                }
              }
            } catch (fallbackErr) {
              logStep('Fallback get-user-email failed', { error: String(fallbackErr) });
            }
          }
        }
        
        if (!customerEmail) {
          logStep('EMAIL_PAYMENT_ERROR', { error: 'No customer email available after all attempts', orderId, userId: order.user_id });
        } else {
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-order-emails`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': internalApiSecret
            },
            body: JSON.stringify({ 
              orderId,
              customerEmail,
              customerName
            })
          });
          
          const emailResult = await emailResponse.json();
          
          if (emailResult.error) {
            logStep('EMAIL_PAYMENT_ERROR', { error: emailResult.error, orderId, email: customerEmail });
          } else {
            logStep('EMAIL_PAYMENT_SENT', { orderId, email: customerEmail });
          }
        }
      } catch (emailError) {
        const errorMsg = emailError instanceof Error ? emailError.message : String(emailError);
        logStep('EMAIL_PAYMENT_ERROR', { error: errorMsg, orderId });
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

    // IDEMPOTÊNCIA: Marcar evento como processado
    await supabase.rpc('mark_webhook_processed', {
      p_event_id: String(dataId),
      p_provider: 'mercadopago',
      p_event_type: notificationType || 'payment',
      p_payload: { orderId, status: newPaymentStatus }
    });

    // AUDITORIA: Registrar webhook processado
    await supabase.rpc('log_audit', {
      p_user_id: null,
      p_action: 'webhook_processed',
      p_entity_type: 'mercadopago_event',
      p_entity_id: String(dataId),
      p_metadata: { event_type: notificationType, order_id: orderId }
    });

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
