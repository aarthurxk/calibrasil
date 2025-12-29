import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the JWT from authorization header to verify admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("[ADMIN-TRIGGER] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Faltou header Authorization" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("[ADMIN-TRIGGER] Invalid token:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Token inválido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin");
    if (!isAdmin) {
      console.error("[ADMIN-TRIGGER] User is not admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden", message: "Apenas admins podem executar esta ação" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const { action, testMode, testEmail } = await req.json();
    console.log("[ADMIN-TRIGGER] Admin", user.email, "executing action:", action, "testMode:", testMode);

    const internalSecret = Deno.env.get("INTERNAL_API_SECRET");
    if (!internalSecret) {
      console.error("[ADMIN-TRIGGER] INTERNAL_API_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server Error", message: "INTERNAL_API_SECRET não configurado" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let targetFunction: string;
    switch (action) {
      case "abandoned-cart":
        targetFunction = "send-abandoned-cart-email";
        break;
      case "review-request":
        targetFunction = "send-review-request-email";
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Bad Request", message: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    console.log("[ADMIN-TRIGGER] Calling", targetFunction, "with internal secret");

    // Call the target function with the internal secret
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const response = await fetch(`${supabaseUrl}/functions/v1/${targetFunction}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "apikey": supabaseAnonKey,
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({ testMode: testMode === true, testEmail: testEmail || null }),
    });

    const result = await response.json();
    console.log("[ADMIN-TRIGGER] Result from", targetFunction, ":", JSON.stringify(result));

    return new Response(
      JSON.stringify({ 
        success: response.ok, 
        action,
        targetFunction,
        result 
      }),
      { 
        status: response.ok ? 200 : response.status, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error: any) {
    console.error("[ADMIN-TRIGGER] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
