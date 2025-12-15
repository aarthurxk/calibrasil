import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  color?: string;
  model?: string;
  image?: string;
}

interface CheckoutRequest {
  items: CartItem[];
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: {
    street: string;
    houseNumber: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
  shippingCost: number;
  couponCode?: string;
  success_url: string;
  cancel_url: string;
  user_id?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-MERCADOPAGO-CHECKOUT] ${step}${detailsStr}`);
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 10;
  
  const clientData = rateLimitMap.get(clientIP);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (clientData.count >= maxRequests) {
    return false;
  }
  
  clientData.count++;
  return true;
}

// Validate coupon
async function validateCoupon(supabase: any, couponCode: string, orderTotal: number) {
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', couponCode.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !coupon) {
    logStep('Coupon not found or inactive', { couponCode });
    return null;
  }

  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    logStep('Coupon not yet valid', { valid_from: coupon.valid_from });
    return null;
  }

  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    logStep('Coupon expired', { valid_until: coupon.valid_until });
    return null;
  }

  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    logStep('Coupon usage limit reached', { max_uses: coupon.max_uses, used_count: coupon.used_count });
    return null;
  }

  if (coupon.min_purchase && orderTotal < coupon.min_purchase) {
    logStep('Order total below minimum purchase', { min_purchase: coupon.min_purchase, orderTotal });
    return null;
  }

  return coupon;
}

// Get installment plan based on order total
function getInstallments(total: number): number {
  if (total < 100) return 1;
  if (total < 200) return 3;
  return 6;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  
  if (!checkRateLimit(clientIP)) {
    logStep('Rate limit exceeded', { clientIP });
    return new Response(
      JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    logStep('Function started');

    const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    
    if (!mercadoPagoToken) {
      throw new Error("Mercado Pago credentials not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: CheckoutRequest = await req.json();
    logStep('Request received', { itemCount: requestData.items.length });

    const { items, customerEmail, customerName, customerPhone, shippingAddress, shippingCost, couponCode, success_url, cancel_url, user_id } = requestData;

    // Validate URLs
    const allowedDomains = ["localhost", "lovableproject.com", "lovable.app", "calibrasil.com"];
    const isValidUrl = (url: string) => {
      try {
        const urlObj = new URL(url);
        return allowedDomains.some(domain => urlObj.hostname.includes(domain));
      } catch {
        return false;
      }
    };

    if (!isValidUrl(success_url) || !isValidUrl(cancel_url)) {
      throw new Error("Invalid redirect URLs");
    }

    // Fetch real product prices from database
    const productIds = items.map(item => item.id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, price, name, image')
      .in('id', productIds);

    if (productsError || !products) {
      throw new Error("Failed to fetch product prices");
    }

    // Create price lookup map
    const priceMap = new Map(products.map(p => [p.id, { price: p.price, image: p.image }]));

    // Calculate real total with validated prices
    let realItemsTotal = 0;
    const validatedItems = items.map(item => {
      const productData = priceMap.get(item.id);
      if (!productData) {
        throw new Error(`Product not found: ${item.id}`);
      }
      realItemsTotal += productData.price * item.quantity;
      return { ...item, price: productData.price, image: item.image || productData.image };
    });

    // Get store settings for shipping validation
    const { data: storeSettings } = await supabase
      .from('store_settings')
      .select('free_shipping_threshold, standard_shipping_rate')
      .single();

    let realShippingCost = shippingCost;
    if (storeSettings) {
      if (realItemsTotal >= (storeSettings.free_shipping_threshold || 250)) {
        realShippingCost = 0;
      } else {
        realShippingCost = storeSettings.standard_shipping_rate || 29.90;
      }
    }

    // Validate and apply coupon
    let discountAmount = 0;
    let validatedCoupon = null;
    if (couponCode) {
      validatedCoupon = await validateCoupon(supabase, couponCode, realItemsTotal);
      if (validatedCoupon) {
        discountAmount = (realItemsTotal * validatedCoupon.discount_percent) / 100;
        logStep('Coupon applied', { code: couponCode, discount: discountAmount });
      }
    }

    const finalTotal = realItemsTotal + realShippingCost - discountAmount;
    logStep('Order totals calculated', { itemsTotal: realItemsTotal, shipping: realShippingCost, discount: discountAmount, final: finalTotal });

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user_id || null,
        guest_email: user_id ? null : customerEmail,
        phone: customerPhone,
        total: finalTotal,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'mercadopago',
        payment_gateway: 'mercadopago',
        shipping_address: shippingAddress,
        coupon_code: validatedCoupon?.code || null,
        discount_amount: discountAmount
      })
      .select()
      .single();

    if (orderError || !order) {
      logStep('Error creating order', { error: orderError });
      throw new Error("Failed to create order");
    }

    logStep('Order created', { orderId: order.id });

    // Insert order items
    const orderItems = validatedItems.map(item => ({
      order_id: order.id,
      product_id: item.id,
      product_name: `${item.name}${item.color ? ` - ${item.color}` : ''}${item.model ? ` - ${item.model}` : ''}`,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      logStep('Error creating order items', { error: itemsError });
    }

    // Build Mercado Pago preference items
    const mercadoPagoItems = validatedItems.map((item) => ({
      id: item.id,
      title: `${item.name}${item.color ? ` - ${item.color}` : ''}${item.model ? ` - ${item.model}` : ''}`.substring(0, 256),
      description: `${item.name}`.substring(0, 256),
      picture_url: item.image || undefined,
      quantity: item.quantity,
      unit_price: Number(item.price),
      currency_id: 'BRL'
    }));

    // Add shipping as an item if applicable
    if (realShippingCost > 0) {
      mercadoPagoItems.push({
        id: 'shipping',
        title: 'Frete',
        description: 'Custo de envio',
        picture_url: undefined,
        quantity: 1,
        unit_price: Number(realShippingCost),
        currency_id: 'BRL'
      });
    }

    // Add discount as negative item if applicable
    if (discountAmount > 0) {
      mercadoPagoItems.push({
        id: 'discount',
        title: `Desconto (${validatedCoupon?.code})`,
        description: `Cupom de desconto: ${validatedCoupon?.discount_percent}%`,
        picture_url: undefined,
        quantity: 1,
        unit_price: -Number(discountAmount),
        currency_id: 'BRL'
      });
    }

    // Parse customer name
    const nameParts = customerName.trim().split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Cali';

    // Clean phone number
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const phoneAreaCode = cleanPhone.substring(0, 2) || '11';
    const phoneNumber = cleanPhone.substring(2) || '999999999';

    // Get max installments based on total
    const maxInstallments = getInstallments(finalTotal);

    // Build Mercado Pago Preference payload
    const preferencePayload = {
      items: mercadoPagoItems,
      payer: {
        name: firstName,
        surname: lastName,
        email: customerEmail,
        phone: {
          area_code: phoneAreaCode,
          number: phoneNumber
        },
        address: {
          street_name: shippingAddress.street,
          street_number: parseInt(shippingAddress.houseNumber) || 1,
          zip_code: shippingAddress.zip.replace(/\D/g, '')
        }
      },
      shipments: {
        receiver_address: {
          street_name: shippingAddress.street,
          street_number: parseInt(shippingAddress.houseNumber) || 1,
          zip_code: shippingAddress.zip.replace(/\D/g, ''),
          city_name: shippingAddress.city,
          state_name: shippingAddress.state
        }
      },
      back_urls: {
        success: `${success_url}?order_id=${order.id}&gateway=mercadopago`,
        failure: cancel_url,
        pending: `${success_url}?order_id=${order.id}&gateway=mercadopago&status=pending`
      },
      auto_return: 'approved',
      external_reference: order.id,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'CALIBRASIL',
      payment_methods: {
        excluded_payment_types: [],
        excluded_payment_methods: [],
        installments: maxInstallments,
        default_installments: 1
      },
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    logStep('Creating Mercado Pago preference', { reference: order.id, maxInstallments });

    // Create Mercado Pago Preference
    const mercadoPagoApiUrl = 'https://api.mercadopago.com/checkout/preferences';
    
    const mercadoPagoResponse = await fetch(mercadoPagoApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mercadoPagoToken}`
      },
      body: JSON.stringify(preferencePayload)
    });

    const responseText = await mercadoPagoResponse.text();
    logStep('Mercado Pago raw response', { status: mercadoPagoResponse.status, body: responseText.substring(0, 500) });
    
    let mercadoPagoData;
    try {
      mercadoPagoData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      logStep('Failed to parse Mercado Pago response', { responseText });
      throw new Error(`Erro na resposta do Mercado Pago: ${responseText || 'Resposta vazia'}`);
    }

    if (!mercadoPagoResponse.ok) {
      logStep('Mercado Pago error', { error: mercadoPagoData });
      
      // Update order status to failed
      await supabase
        .from('orders')
        .update({ status: 'cancelled', payment_status: 'failed' })
        .eq('id', order.id);
      
      throw new Error(mercadoPagoData.message || 'Erro ao criar checkout Mercado Pago');
    }

    // Update order with Mercado Pago preference ID
    const preferenceId = mercadoPagoData.id;
    await supabase
      .from('orders')
      .update({ 
        mercadopago_payment_id: preferenceId,
        status: 'awaiting_payment',
        payment_status: 'awaiting_payment'
      })
      .eq('id', order.id);

    // Get checkout URL (init_point for production, sandbox_init_point for testing)
    const checkoutUrl = mercadoPagoData.init_point || mercadoPagoData.sandbox_init_point;

    logStep('Preference created successfully', { preferenceId, url: checkoutUrl });

    return new Response(
      JSON.stringify({ 
        success: true,
        url: checkoutUrl,
        orderId: order.id,
        preferenceId
      }),
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
