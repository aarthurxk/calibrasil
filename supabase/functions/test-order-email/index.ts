// Edge Function Deploy - Updated: 2026-01-05
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Test endpoint to manually trigger order confirmation email
 * Usage: POST /test-order-email with { orderId: "xxx" }
 * Requires admin authorization
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalApiSecret = Deno.env.get("INTERNAL_API_SECRET")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization - require service role or internal secret
    const authHeader = req.headers.get("Authorization");
    const internalSecret = req.headers.get("x-internal-secret");
    
    const isAuthorized = internalSecret === internalApiSecret || 
                         authHeader?.includes(supabaseServiceKey);
    
    if (!isAuthorized) {
      // Try to check if user is admin via JWT
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !userData?.user) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Check if user has admin role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.user.id)
          .eq('role', 'admin')
          .single();
        
        if (!roleData) {
          return new Response(
            JSON.stringify({ error: "Admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[TEST-ORDER-EMAIL] Testing email for order:", orderId);

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.log("[TEST-ORDER-EMAIL] Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found", details: orderError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine customer email
    let customerEmail = order.guest_email;
    let customerName = null;

    if (!customerEmail && order.user_id) {
      console.log("[TEST-ORDER-EMAIL] Fetching email for user:", order.user_id);
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(order.user_id);
      
      if (authError) {
        console.log("[TEST-ORDER-EMAIL] Failed to fetch user:", authError);
      } else if (authUser?.user?.email) {
        customerEmail = authUser.user.email;
        customerName = authUser.user.user_metadata?.full_name || null;
      }
    }

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ 
          error: "No email found", 
          details: {
            hasGuestEmail: !!order.guest_email,
            hasUserId: !!order.user_id,
            orderId
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[TEST-ORDER-EMAIL] Sending to:", customerEmail);

    // Trigger email
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
    console.log("[TEST-ORDER-EMAIL] Result:", emailResult);

    if (emailResult.error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailResult.error,
          customerEmail 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        customerEmail,
        result: emailResult
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[TEST-ORDER-EMAIL] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
