import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // For development/testing without webhook secret
      event = JSON.parse(body);
      console.log("Warning: Webhook signature not verified (no secret configured)");
    }

    console.log("Received webhook event:", event.type);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;

        if (orderId) {
          console.log("Payment completed for order:", orderId);

          // Update order status
          const { error } = await supabase
            .from("orders")
            .update({
              payment_status: "paid",
              status: "confirmed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);

          if (error) {
            console.error("Error updating order:", error);
          } else {
            console.log("Order updated successfully:", orderId);

            // Fetch order details for email
            const { data: orderData, error: orderError } = await supabase
              .from("orders")
              .select("*")
              .eq("id", orderId)
              .single();

            if (orderError) {
              console.error("Error fetching order for email:", orderError);
            } else {
              // Fetch order items
              const { data: itemsData, error: itemsError } = await supabase
                .from("order_items")
                .select("*")
                .eq("order_id", orderId);

              if (itemsError) {
                console.error("Error fetching order items:", itemsError);
              } else {
                // Send notification emails
                const shippingAddress = orderData.shipping_address as any;
                const customerEmail = orderData.guest_email || session.customer_email || "";
                const customerName = shippingAddress?.name || "Cliente";
                
                const emailPayload = {
                  orderId: orderId,
                  customerEmail: customerEmail,
                  customerName: customerName,
                  customerPhone: orderData.phone || "",
                  items: itemsData.map((item: any) => ({
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: item.price,
                  })),
                  total: orderData.total,
                  shippingAddress: {
                    name: shippingAddress?.name || "",
                    street: shippingAddress?.street || "",
                    number: shippingAddress?.number || "",
                    complement: shippingAddress?.complement || "",
                    neighborhood: shippingAddress?.neighborhood || "",
                    city: shippingAddress?.city || "",
                    state: shippingAddress?.state || "",
                    zipCode: shippingAddress?.zipCode || "",
                  },
                  paymentMethod: orderData.payment_method || "card",
                };

                console.log("Sending order emails for order:", orderId);

                // Call send-order-emails function
                try {
                  const emailResponse = await fetch(
                    `${supabaseUrl}/functions/v1/send-order-emails`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${supabaseServiceKey}`,
                      },
                      body: JSON.stringify(emailPayload),
                    }
                  );

                  const emailResult = await emailResponse.json();
                  console.log("Email send result:", emailResult);
                } catch (emailError) {
                  console.error("Error sending emails:", emailError);
                }
              }
            }
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;

        if (orderId) {
          console.log("Payment expired for order:", orderId);

          await supabase
            .from("orders")
            .update({
              payment_status: "expired",
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.order_id;

        if (orderId) {
          console.log("Payment failed for order:", orderId);

          await supabase
            .from("orders")
            .update({
              payment_status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        // Handle refunds if needed
        console.log("Charge refunded:", charge.id);
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
