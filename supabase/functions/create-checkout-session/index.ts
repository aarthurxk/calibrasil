import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientIP);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

// HMAC-SHA256 token generation for secure order confirmation access
async function generateHMAC(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  size?: string;
  color?: string;
}

interface CheckoutRequest {
  items: CartItem[];
  email: string;
  phone?: string;
  shipping_address: {
    firstName: string;
    lastName: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  user_id?: string;
  total: number;
  shipping: number;
  shipping_method?: string;
  payment_method: "pix" | "boleto" | "card";
  success_url: string;
  cancel_url: string;
  coupon_code?: string;
}

interface ValidatedCoupon {
  code: string;
  discount_percent: number;
}

// Validate coupon code against database
async function validateCoupon(
  supabase: any,
  couponCode: string,
  orderTotal: number
): Promise<ValidatedCoupon | null> {
  console.log(`[COUPON] Validating coupon: ${couponCode} for total: ${orderTotal}`);

  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", couponCode.toUpperCase())
    .eq("is_active", true)
    .single();

  if (error || !coupon) {
    console.log("[COUPON] Coupon not found or inactive");
    return null;
  }

  const now = new Date();

  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    console.log("[COUPON] Coupon not yet valid");
    return null;
  }

  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    console.log("[COUPON] Coupon expired");
    return null;
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    console.log("[COUPON] Coupon usage limit reached");
    return null;
  }

  if (coupon.min_purchase && orderTotal < coupon.min_purchase) {
    console.log(`[COUPON] Order total ${orderTotal} below minimum ${coupon.min_purchase}`);
    return null;
  }

  console.log(`[COUPON] Valid coupon: ${coupon.code} with ${coupon.discount_percent}% discount`);
  return {
    code: coupon.code,
    discount_percent: coupon.discount_percent,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    if (!checkRateLimit(clientIP)) {
      console.log(`[CHECKOUT-SESSION] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Muitas tentativas. Por favor, aguarde um minuto antes de tentar novamente.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CheckoutRequest = await req.json();
    console.log("Creating checkout session:", { itemCount: body.items?.length, payment_method: body.payment_method, shipping_method: body.shipping_method });

    if (!body.items || body.items.length === 0) {
      throw new Error("Cart is empty");
    }
    if (!body.email) {
      throw new Error("Email is required");
    }

    const isValidUrl = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    };

    const ALLOWED_DOMAINS = ['calibrasil.com', 'lovable.app', 'lovableproject.com', 'localhost'];
    const validateRedirectUrl = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        return ALLOWED_DOMAINS.some(domain => 
          parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
        );
      } catch {
        return false;
      }
    };

    if (!validateRedirectUrl(body.success_url)) {
      console.error("SECURITY: Invalid success_url domain:", body.success_url);
      throw new Error("Invalid redirect URL");
    }
    if (!validateRedirectUrl(body.cancel_url)) {
      console.error("SECURITY: Invalid cancel_url domain:", body.cancel_url);
      throw new Error("Invalid redirect URL");
    }

    // Fetch real product prices from database
    const productIds = body.items.map((item) => item.id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, price, name')
      .in('id', productIds);

    if (productsError || !products) {
      console.error("Error fetching products for price validation:", productsError);
      throw new Error("Failed to validate product prices");
    }

    // Fetch store settings
    const { data: storeSettings, error: settingsError } = await supabase
      .from('store_settings')
      .select('free_shipping_threshold, standard_shipping_rate, shipping_mode')
      .limit(1)
      .single();

    if (settingsError || !storeSettings) {
      console.error("Error fetching store settings:", settingsError);
      throw new Error("Failed to fetch shipping configuration");
    }

    const priceMap = new Map(products.map(p => [p.id, { price: p.price, name: p.name }]));

    let realItemsTotal = 0;

    const lineItems: Array<{
      price_data: {
        currency: string;
        product_data: { name: string; images?: string[] };
        unit_amount: number;
      };
      quantity: number;
    }> = body.items.map((item) => {
      const realProduct = priceMap.get(item.id);
      if (!realProduct) {
        throw new Error(`Product not found: ${item.id}`);
      }

      if (Math.abs(item.price - realProduct.price) > 0.01) {
        console.warn(`SECURITY: Price mismatch detected for product ${item.id}: client=${item.price}, real=${realProduct.price}`);
      }

      realItemsTotal += realProduct.price * item.quantity;

      const validImage = item.image && isValidUrl(item.image) ? [item.image] : undefined;
      
      return {
        price_data: {
          currency: "brl",
          product_data: {
            name: realProduct.name,
            images: validImage,
          },
          unit_amount: Math.round(realProduct.price * 100),
        },
        quantity: item.quantity,
      };
    });

    // Determine real shipping cost based on shipping mode and method
    const isPickup = body.shipping_method === 'pickup';
    let realShipping = 0;
    
    if (isPickup) {
      realShipping = 0;
    } else {
      const shippingMode = storeSettings.shipping_mode || 'correios';
      
      if (shippingMode === 'free') {
        realShipping = 0;
      } else if (shippingMode === 'fixed') {
        const freeThreshold = storeSettings.free_shipping_threshold || 0;
        const standardRate = storeSettings.standard_shipping_rate || 0;
        realShipping = realItemsTotal >= freeThreshold ? 0 : standardRate;
      } else {
        // Correios mode - trust frontend calculation but validate against threshold
        const freeThreshold = storeSettings.free_shipping_threshold || 0;
        if (realItemsTotal >= freeThreshold) {
          realShipping = 0;
        } else {
          realShipping = body.shipping;
        }
      }
    }

    console.log(`[SHIPPING] Mode: ${storeSettings.shipping_mode}, Method: ${body.shipping_method}, Cost: ${realShipping}`);

    if (Math.abs(body.shipping - realShipping) > 0.01) {
      console.warn(`SECURITY: Shipping mismatch detected: client=${body.shipping}, calculated=${realShipping}`);
    }

    // Add shipping as a line item if applicable
    if (realShipping > 0) {
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: "Frete",
          },
          unit_amount: Math.round(realShipping * 100),
        },
        quantity: 1,
      });
    }

    const subtotalBeforeDiscount = realItemsTotal + realShipping;

    // Validate coupon server-side
    let validatedCoupon: ValidatedCoupon | null = null;
    let discountAmount = 0;

    if (body.coupon_code) {
      validatedCoupon = await validateCoupon(supabase, body.coupon_code, realItemsTotal);
      
      if (validatedCoupon) {
        discountAmount = (realItemsTotal * validatedCoupon.discount_percent) / 100;
        discountAmount = Math.round(discountAmount * 100) / 100;
        console.log(`[COUPON] Applied discount: R$ ${discountAmount.toFixed(2)}`);

        lineItems.push({
          price_data: {
            currency: "brl",
            product_data: {
              name: `Desconto (${validatedCoupon.code})`,
            },
            unit_amount: -Math.round(discountAmount * 100),
          },
          quantity: 1,
        });
      } else {
        console.log(`[COUPON] Invalid coupon code: ${body.coupon_code}`);
      }
    }

    const realTotal = subtotalBeforeDiscount - discountAmount;

    // Create pending order in database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: body.user_id || null,
        guest_email: body.user_id ? null : body.email,
        phone: body.phone || null,
        total: realTotal,
        shipping_address: body.shipping_address,
        shipping_method: body.shipping_method || 'standard',
        shipping_cost: realShipping,
        payment_method: body.payment_method,
        payment_status: "pending",
        status: "pending",
        coupon_code: validatedCoupon?.code || null,
        discount_amount: discountAmount > 0 ? discountAmount : null,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error("Failed to create order");
    }

    console.log("Order created:", order.id, validatedCoupon ? `with coupon ${validatedCoupon.code}` : "");

    const orderItems = body.items.map((item) => {
      const realProduct = priceMap.get(item.id);
      return {
        order_id: order.id,
        product_id: item.id,
        product_name: realProduct?.name || item.name,
        price: realProduct?.price || item.price,
        quantity: item.quantity,
      };
    });

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      await supabase.from("orders").delete().eq("id", order.id);
      throw new Error("Failed to create order items");
    }

    let paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = [];
    
    const MINIMUM_AMOUNTS: Record<string, number> = {
      boleto: 5.00,
      pix: 0.50,
      card: 0.50,
    };

    const minAmount = MINIMUM_AMOUNTS[body.payment_method] || 0.50;
    if (realTotal < minAmount) {
      throw new Error(`O valor mínimo para ${body.payment_method === 'boleto' ? 'Boleto' : body.payment_method === 'pix' ? 'Pix' : 'Cartão'} é R$ ${minAmount.toFixed(2).replace('.', ',')}`);
    }
    
    switch (body.payment_method) {
      case "pix":
        paymentMethodTypes = ["pix"];
        break;
      case "boleto":
        paymentMethodTypes = ["boleto"];
        break;
      case "card":
      default:
        paymentMethodTypes = ["card"];
        break;
    }

    const totalInCents = Math.round(realTotal * 100);
    const getInstallmentsConfig = () => {
      if (totalInCents < 10000) return undefined;
      if (totalInCents < 20000) return { enabled: true };
      return { enabled: true };
    };

    // Generate secure confirmation token
    const internalSecret = Deno.env.get('INTERNAL_API_SECRET');
    let confirmationToken = '';
    if (internalSecret) {
      confirmationToken = await generateHMAC(order.id, internalSecret);
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: paymentMethodTypes,
      line_items: lineItems,
      mode: "payment",
      success_url: `${body.success_url}?order_id=${order.id}&token=${confirmationToken}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${body.cancel_url}?order_id=${order.id}`,
      customer_email: body.email,
      metadata: {
        order_id: order.id,
        coupon_code: validatedCoupon?.code || "",
        discount_amount: discountAmount.toString(),
        shipping_method: body.shipping_method || 'standard',
      },
      locale: "pt-BR",
    };

    if (body.payment_method === "boleto") {
      sessionParams.payment_method_options = {
        boleto: {
          expires_after_days: 3,
        },
      };
    } else if (body.payment_method === "card") {
      const installmentsConfig = getInstallmentsConfig();
      if (installmentsConfig) {
        sessionParams.payment_method_options = {
          card: {
            installments: installmentsConfig,
          },
        };
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("Stripe session created:", session.id);

    await supabase
      .from("orders")
      .update({ 
        status: "awaiting_payment",
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        sessionUrl: session.url,
        orderId: order.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to create checkout session",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
