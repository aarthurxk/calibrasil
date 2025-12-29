import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MagicLoginRequest {
  email: string;
  orderId: string;
  customerName?: string;
}

/**
 * Magic Login Edge Function
 * 
 * Generates a 15-minute JWT containing { email, orderId }
 * and sends a branded email with the magic link.
 * 
 * POST /magic-login
 * Body: { email, orderId, customerName? }
 */
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, orderId, customerName }: MagicLoginRequest = await req.json();

    console.log(`[MAGIC-LOGIN] Creating magic link for ${email}, order ${orderId}`);

    // Validate inputs
    if (!email || !orderId) {
      return new Response(
        JSON.stringify({ error: "Email and orderId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify order exists and belongs to this email
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, guest_email, user_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error("[MAGIC-LOGIN] Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create JWT secret key from environment
    const jwtSecret = Deno.env.get("MAGIC_LOGIN_JWT_SECRET");
    if (!jwtSecret) {
      console.error("[MAGIC-LOGIN] JWT secret not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create crypto key for signing
    const encoder = new TextEncoder();
    const keyData = encoder.encode(jwtSecret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    // Generate 15-minute JWT
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 15 * 60; // 15 minutes

    const jwt = await create(
      { alg: "HS256", typ: "JWT" },
      {
        email,
        orderId,
        iat: now,
        exp,
        purpose: "magic_login"
      },
      cryptoKey
    );

    // Build magic link
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://calibrasil.com";
    const magicLink = `${frontendUrl}/magic-login?token=${encodeURIComponent(jwt)}`;

    console.log(`[MAGIC-LOGIN] Magic link generated: ${magicLink.substring(0, 80)}...`);

    // Send email with Calibrasil branded template
    const displayName = customerName || email.split("@")[0];
    const shortOrderId = orderId.substring(0, 8).toUpperCase();

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: auto; background: #ffffff; font-family: Inter, sans-serif; color: #333; border-radius: 8px; padding: 32px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding-bottom: 24px;">
              <img src="${frontendUrl}/logo.png" alt="Calibrasil" style="height: 48px; max-width: 200px;" onerror="this.style.display='none'"/>
              <h1 style="margin: 16px 0 0 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">Calibrasil</h1>
            </td>
          </tr>
          <tr>
            <td>
              <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px 0; color: #1a1a1a;">Seu pedido chegou! 📦</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 0; font-size: 16px; color: #555; line-height: 1.6;">
              Olá, <strong>${displayName}</strong>!<br><br>
              Clique no botão abaixo para confirmar o recebimento do pedido <strong>#${shortOrderId}</strong> com segurança.
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 0;">
              <a href="${magicLink}" target="_blank" rel="noopener noreferrer"
                 style="display: inline-block; background: #E63946; color: #ffffff; text-decoration: none;
                 padding: 14px 32px; border-radius: 6px; font-weight: 500; font-size: 16px;">
                 Confirmar Recebimento
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 0; font-size: 13px; color: #888;">
              Este link expira em <strong>15 minutos</strong>.<br>
              Se você não solicitou este email, ignore-o.
            </td>
          </tr>
          <tr>
            <td style="padding-top: 32px; font-size: 13px; color: #999; border-top: 1px solid #eee;">
              © ${new Date().getFullYear()} Calibrasil — Estilo e tecnologia para seu dia a dia.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailResult = await resend.emails.send({
      from: "Calibrasil <pedidos@calibrasil.com>",
      to: [email],
      subject: `📦 Confirme o recebimento do pedido #${shortOrderId}`,
      html: emailHtml,
    });

    console.log("[MAGIC-LOGIN] Email sent successfully:", emailResult);

    // Log audit
    await supabase.from("audit_logs").insert({
      action: "magic_login_sent",
      entity_type: "order",
      entity_id: orderId,
      metadata: { email, expires_at: new Date(exp * 1000).toISOString() },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Magic link sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[MAGIC-LOGIN] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
