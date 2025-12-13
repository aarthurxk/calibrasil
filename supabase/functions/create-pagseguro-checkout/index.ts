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
  console.log(`[CREATE-PAGSEGURO-CHECKOUT] ${step}${detailsStr}`);
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

    const pagseguroToken = Deno.env.get("PAGSEGURO_TOKEN");
    const pagseguroEmail = Deno.env.get("PAGSEGURO_EMAIL");
    
    if (!pagseguroToken || !pagseguroEmail) {
      throw new Error("PagSeguro credentials not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: CheckoutRequest = await req.json();
    logStep('Request received', { itemCount: requestData.items.length });

    const { items, customerEmail, customerName, customerPhone, shippingAddress, shippingCost, couponCode, success_url, cancel_url, user_id } = requestData;

    // Validate URLs
    const origin = req.headers.get("origin") || "";
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
      .select('id, price, name')
      .in('id', productIds);

    if (productsError || !products) {
      throw new Error("Failed to fetch product prices");
    }

    // Create price lookup map
    const priceMap = new Map(products.map(p => [p.id, p.price]));

    // Calculate real total with validated prices
    let realItemsTotal = 0;
    const validatedItems = items.map(item => {
      const realPrice = priceMap.get(item.id);
      if (!realPrice) {
        throw new Error(`Product not found: ${item.id}`);
      }
      realItemsTotal += realPrice * item.quantity;
      return { ...item, price: realPrice };
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
        payment_method: 'pagseguro',
        payment_gateway: 'pagseguro',
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

    // Build PagSeguro checkout request
    // Using PagSeguro API v4 (Checkout Transparente)
    const pagseguroItems = validatedItems.map((item, index) => ({
      id: item.id.substring(0, 100),
      description: `${item.name}${item.color ? ` - ${item.color}` : ''}${item.model ? ` - ${item.model}` : ''}`.substring(0, 100),
      quantity: item.quantity,
      amount: Math.round(item.price * 100) // PagSeguro uses cents
    }));

    // Add shipping as an item if applicable
    if (realShippingCost > 0) {
      pagseguroItems.push({
        id: 'shipping',
        description: 'Frete',
        quantity: 1,
        amount: Math.round(realShippingCost * 100)
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

    // Build PagSeguro Checkout payload
    const checkoutPayload = {
      reference_id: order.id,
      customer: {
        name: customerName,
        email: customerEmail,
        tax_id: '00000000000', // CPF placeholder - PagSeguro will ask
        phones: [{
          country: '55',
          area: phoneAreaCode,
          number: phoneNumber,
          type: 'MOBILE'
        }]
      },
      items: pagseguroItems,
      shipping: {
        address: {
          street: shippingAddress.street,
          number: shippingAddress.houseNumber,
          complement: shippingAddress.complement || '',
          locality: shippingAddress.neighborhood,
          city: shippingAddress.city,
          region_code: shippingAddress.state,
          country: 'BRA',
          postal_code: shippingAddress.zip.replace(/\D/g, '')
        }
      },
      notification_urls: [`${supabaseUrl}/functions/v1/pagseguro-webhook`],
      redirect_urls: {
        return_url: `${success_url}?order_id=${order.id}&gateway=pagseguro`,
        cancel_url: cancel_url
      },
      payment_methods: [
        { type: 'CREDIT_CARD' },
        { type: 'DEBIT_CARD' },
        { type: 'PIX' }
      ],
      payment_methods_configs: [
        {
          type: 'CREDIT_CARD',
          config_options: [
            { option: 'INSTALLMENTS_LIMIT', value: '6' }
          ]
        }
      ],
      soft_descriptor: 'CALIBRASIL'
    };

    logStep('Creating PagSeguro checkout', { reference: order.id });

    // Create PagSeguro Checkout
    // Using Sandbox URL for testing - change to production when ready
    const pagseguroApiUrl = 'https://api.pagseguro.com/checkouts';
    
    const pagseguroResponse = await fetch(pagseguroApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pagseguroToken}`,
        'x-api-version': '4.0'
      },
      body: JSON.stringify(checkoutPayload)
    });

    const pagseguroData = await pagseguroResponse.json();
    logStep('PagSeguro response', { status: pagseguroResponse.status, data: pagseguroData });

    if (!pagseguroResponse.ok) {
      logStep('PagSeguro error', { error: pagseguroData });
      
      // Update order status to failed
      await supabase
        .from('orders')
        .update({ status: 'cancelled', payment_status: 'failed' })
        .eq('id', order.id);
      
      throw new Error(pagseguroData.error_messages?.[0]?.description || 'Erro ao criar checkout PagSeguro');
    }

    // Update order with PagSeguro transaction ID
    const checkoutId = pagseguroData.id;
    await supabase
      .from('orders')
      .update({ 
        pagseguro_transaction_id: checkoutId,
        status: 'awaiting_payment',
        payment_status: 'awaiting_payment'
      })
      .eq('id', order.id);

    // Get checkout URL from links
    const checkoutLink = pagseguroData.links?.find((link: any) => link.rel === 'PAY');
    const checkoutUrl = checkoutLink?.href || `https://pagseguro.uol.com.br/checkout/v2/payment.html?code=${checkoutId}`;

    logStep('Checkout created successfully', { checkoutId, url: checkoutUrl });

    return new Response(
      JSON.stringify({ 
        success: true,
        url: checkoutUrl,
        orderId: order.id,
        checkoutId
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
