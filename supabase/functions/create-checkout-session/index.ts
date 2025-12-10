import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    address: string;
    city: string;
    zip: string;
  };
  user_id?: string;
  total: number;
  shipping: number;
  payment_method: "pix" | "boleto" | "card";
  success_url: string;
  cancel_url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    console.log("Creating checkout session:", body);

    // Validate required fields
    if (!body.items || body.items.length === 0) {
      throw new Error("Cart is empty");
    }
    if (!body.email) {
      throw new Error("Email is required");
    }

    // Helper function to validate if a string is a valid absolute URL
    const isValidUrl = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    };

    // Create line items for Stripe
    const lineItems: Array<{
      price_data: {
        currency: string;
        product_data: { name: string; images?: string[] };
        unit_amount: number;
      };
      quantity: number;
    }> = body.items.map((item) => {
      // Only include images if it's a valid absolute URL
      const validImage = item.image && isValidUrl(item.image) ? [item.image] : undefined;
      
      return {
        price_data: {
          currency: "brl",
          product_data: {
            name: item.name,
            images: validImage,
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      };
    });

    // Add shipping as a line item if applicable
    if (body.shipping > 0) {
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: {
            name: "Frete",
          },
          unit_amount: Math.round(body.shipping * 100),
        },
        quantity: 1,
      });
    }

    // Create pending order in database first
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: body.user_id || null,
        guest_email: body.user_id ? null : body.email,
        phone: body.phone || null,
        total: body.total,
        shipping_address: body.shipping_address,
        payment_method: body.payment_method,
        payment_status: "pending",
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error("Failed to create order");
    }

    console.log("Order created:", order.id);

    // Insert order items
    const orderItems = body.items.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      // Rollback: delete the order
      await supabase.from("orders").delete().eq("id", order.id);
      throw new Error("Failed to create order items");
    }

    // Determine payment method types for Stripe
    let paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = [];
    
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

    // Create Stripe Checkout Session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: paymentMethodTypes,
      line_items: lineItems,
      mode: "payment",
      success_url: `${body.success_url}?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${body.cancel_url}?order_id=${order.id}`,
      customer_email: body.email,
      metadata: {
        order_id: order.id,
      },
      locale: "pt-BR",
    };

    // Add boleto-specific options
    if (body.payment_method === "boleto") {
      sessionParams.payment_method_options = {
        boleto: {
          expires_after_days: 3,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("Stripe session created:", session.id);

    // Update order with Stripe session ID
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
