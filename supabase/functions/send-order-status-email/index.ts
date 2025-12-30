import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderStatusEmailRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  oldStatus: string;
  newStatus: string;
  trackingCode?: string;
}

interface EmailTemplate {
  template_key: string;
  subject: string;
  html_content: string;
  variables: string[];
}

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Generate confirmation URL using existing order_confirm_tokens system
// This creates a secure token via RPC and returns a URL that works without auth
async function generateConfirmReceiptUrl(supabase: any, orderId: string): Promise<string> {
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://calibrasil.com";

  try {
    // Call RPC to create/update token (returns raw token, stores hash in DB)
    const { data: token, error } = await supabase.rpc("create_order_confirm_token", {
      p_order_id: orderId,
    });

    if (error) {
      console.error("[ORDER-STATUS] Failed to create confirm token:", error);
      throw new Error("Failed to create confirmation token");
    }

    console.log(`[ORDER-STATUS] Created confirm token for order ${orderId.substring(0, 8)}`);

    // Return URL for public confirmation page (no auth required)
    return `${frontendUrl}/confirmar-recebimento?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`;
  } catch (err) {
    console.error("[ORDER-STATUS] Error generating confirm URL:", err);
    throw err;
  }
}

// Keep Magic Login for review only (backward compatibility)
async function generateMagicLoginUrl(email: string, orderId: string): Promise<string> {
  const jwtSecret = Deno.env.get("MAGIC_LOGIN_JWT_SECRET");
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://calibrasil.com";

  if (!jwtSecret) {
    console.error("[ORDER-STATUS] MAGIC_LOGIN_JWT_SECRET not configured");
    throw new Error("JWT secret not configured");
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(jwtSecret);
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 7 * 24 * 60 * 60; // 7 days

  const jwt = await create(
    { alg: "HS256", typ: "JWT" },
    {
      email,
      orderId,
      iat: now,
      exp,
      purpose: "magic_login",
    },
    cryptoKey,
  );

  return `${frontendUrl}/magic-login?token=${jwt}`;
}

const getStatusInfo = (status: string): { label: string; emoji: string; color: string; message: string } => {
  const statusMap: Record<string, { label: string; emoji: string; color: string; message: string }> = {
    processing: {
      label: "Processando",
      emoji: "⚙️",
      color: "#3b82f6",
      message: "Estamos preparando seu pedido com carinho!",
    },
    shipped: {
      label: "Enviado",
      emoji: "📦",
      color: "#8b5cf6",
      message: "Seu pedido está a caminho! Fique de olho no rastreamento.",
    },
    delivered: {
      label: "Entregue",
      emoji: "✅",
      color: "#16a34a",
      message: "Seu pedido foi entregue! Esperamos que você ame seus novos produtos.",
    },
    cancelled: {
      label: "Cancelado",
      emoji: "❌",
      color: "#dc2626",
      message: "Seu pedido foi cancelado. Se tiver dúvidas, entre em contato conosco.",
    },
    pending: {
      label: "Pendente",
      emoji: "⏳",
      color: "#eab308",
      message: "Seu pedido está aguardando processamento.",
    },
  };

  return (
    statusMap[status] || {
      label: status,
      emoji: "📋",
      color: "#6b7280",
      message: "O status do seu pedido foi atualizado.",
    }
  );
};

// Replaces template variables like {{variable_name}} with actual values
// HTML sections (tracking_section, confirmation_section, review_section) are not escaped
const replaceTemplateVariables = (template: string, variables: Record<string, string>): string => {
  let result = template;
  const htmlSections = ["tracking_section", "confirmation_section", "review_section"];

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    // Don't escape HTML for section variables that contain pre-formatted HTML
    const replacement = htmlSections.includes(key) ? value : escapeHtml(value);
    result = result.replace(regex, replacement);
  }
  return result;
};

// Fetch template from database
async function fetchTemplate(supabase: any, templateKey: string): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from("email_templates")
    .select("template_key, subject, html_content, variables")
    .eq("template_key", templateKey)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error(`[ORDER-STATUS] Error fetching template ${templateKey}:`, error);
    return null;
  }

  return data;
}

// Generate email using database template or fallback to hardcoded
async function generateEmailFromTemplate(
  supabase: any,
  data: OrderStatusEmailRequest,
  templateKey: string,
  variables: Record<string, string>,
): Promise<{ subject: string; html: string }> {
  const template = await fetchTemplate(supabase, templateKey);

  if (template) {
    console.log(`[ORDER-STATUS] Using database template: ${templateKey}`);
    return {
      subject: replaceTemplateVariables(template.subject, variables),
      html: replaceTemplateVariables(template.html_content, variables),
    };
  }

  console.log(`[ORDER-STATUS] Template ${templateKey} not found, using fallback`);
  return generateFallbackEmail(supabase, data);
}

// Fallback hardcoded email for when template is not found
async function generateFallbackEmail(
  supabase: any,
  data: OrderStatusEmailRequest,
): Promise<{ subject: string; html: string }> {
  const statusInfo = getStatusInfo(data.newStatus);
  const storeUrl = Deno.env.get("FRONTEND_URL") || "https://calibrasil.com";

  // Use token-based confirmation URL (works without auth, no blank screen issues)
  const confirmUrl = await generateConfirmReceiptUrl(supabase, data.orderId);

  const subject = `${statusInfo.emoji} Seu pedido foi ${statusInfo.label.toLowerCase()}! #${data.orderId.substring(0, 8).toUpperCase()}`;

  const html = `
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
        <table role="presentation" style="width: 100%; max-width: 600px; background: #ffffff; border-radius: 8px; padding: 32px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding-bottom: 24px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">Calibrasil</h1>
            </td>
          </tr>
          <tr>
            <td>
              <div style="display: inline-block; background: ${statusInfo.color}; color: white; padding: 8px 16px; border-radius: 16px; font-size: 14px; font-weight: 500; margin-bottom: 16px;">
                ${statusInfo.emoji} ${statusInfo.label}
              </div>
              <h2 style="font-size: 20px; font-weight: 600; margin: 16px 0 8px 0; color: #1a1a1a;">Olá, ${escapeHtml(data.customerName)}!</h2>
              <p style="font-size: 16px; color: #555; margin: 0;">${statusInfo.message}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 0;">
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
                <p style="margin: 0; font-size: 14px; color: #666;"><strong>Pedido:</strong> #${data.orderId.substring(0, 8).toUpperCase()}</p>
                ${
                  data.trackingCode
                    ? `
                  <p style="margin: 12px 0 0 0; font-size: 14px; color: #666;">
                    <strong>Rastreamento:</strong> 
                    <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${escapeHtml(data.trackingCode)}</code>
                  </p>
                  <a href="https://rastreamento.correios.com.br/app/index.php/" target="_blank" style="display: inline-block; margin-top: 12px; color: #8b5cf6; text-decoration: underline; font-size: 14px;">📍 Rastrear Pedido</a>
                `
                    : ""
                }
              </div>
            </td>
          </tr>
          ${
            data.newStatus === "shipped" || data.newStatus === "delivered"
              ? `
            <tr>
              <td style="padding: 24px 0;">
                <p style="font-size: 14px; color: #555; margin: 0 0 16px 0;">
                  ${data.newStatus === "shipped" ? "Já recebeu seu pedido?" : "Confirme o recebimento e avalie seus produtos:"}
                </p>
                <a href="${confirmUrl}" target="_blank" rel="noopener noreferrer"
                   style="display: inline-block; background: #E63946; color: #ffffff; text-decoration: none;
                   padding: 14px 32px; border-radius: 6px; font-weight: 500; font-size: 16px;">
                   ✅ Confirmar Recebimento
                </a>
                <p style="font-size: 12px; color: #888; margin: 16px 0 0 0;">
                  Este link expira em 7 dias.
                </p>
              </td>
            </tr>
          `
              : ""
          }
          <tr>
            <td style="padding-top: 32px; border-top: 1px solid #eee;">
              <p style="font-size: 13px; color: #999; margin: 0;">
                Dúvidas? <a href="mailto:oi@calibrasil.com" style="color: #E63946;">oi@calibrasil.com</a>
              </p>
              <p style="font-size: 12px; color: #999; margin: 16px 0 0 0;">
                © ${new Date().getFullYear()} Calibrasil — Estilo e tecnologia para seu dia a dia.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify the user is an admin or manager
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[ORDER-STATUS] No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Client for auth check (user context)
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });

    // Client for template fetch and token creation (service role to bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("[ORDER-STATUS] Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has admin or manager role
    const { data: roleData, error: roleError } = await supabaseAuth
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData || !["admin", "manager"].includes(roleData.role)) {
      console.error("[ORDER-STATUS] User does not have permission to send order emails");
      return new Response(JSON.stringify({ error: "Forbidden - Admin or Manager role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data: OrderStatusEmailRequest = await req.json();

    console.log(`[ORDER-STATUS] Sending status update email for order ${data.orderId}`);
    console.log(`[ORDER-STATUS] Status change: ${data.oldStatus} -> ${data.newStatus}`);

    let emailContent: { subject: string; html: string };

    // For shipped status with tracking code, use tracking_code_notification template
    if (data.newStatus === "shipped" && data.trackingCode) {
      // Use token-based confirmation URL (works without auth)
      const confirmUrl = await generateConfirmReceiptUrl(supabaseAdmin, data.orderId);
      const trackingUrl = "https://rastreamento.correios.com.br/app/index.php";

      const variables: Record<string, string> = {
        customer_name: data.customerName,
        order_id: data.orderId.substring(0, 8).toUpperCase(),
        tracking_code: data.trackingCode,
        tracking_url: trackingUrl,
        confirmation_url: confirmUrl,
        store_name: "Cali Brasil",
        store_email: "oi@calibrasil.com",
      };

      emailContent = await generateEmailFromTemplate(supabaseAdmin, data, "tracking_code_notification", variables);
    } else if (data.newStatus === "delivered") {
      // For delivered status, use token-based confirmation + magic login for review
      const confirmUrl = await generateConfirmReceiptUrl(supabaseAdmin, data.orderId);
      const reviewUrl = await generateMagicLoginUrl(data.customerEmail, data.orderId);

      const variables: Record<string, string> = {
        customer_name: data.customerName,
        order_id: data.orderId.substring(0, 8).toUpperCase(),
        confirmation_url: confirmUrl,
        review_url: reviewUrl,
        store_name: "Cali Brasil",
        store_email: "oi@calibrasil.com",
      };

      emailContent = await generateEmailFromTemplate(supabaseAdmin, data, "order_delivered", variables);
    } else {
      // For other status updates, use order_status_update template
      const statusInfo = getStatusInfo(data.newStatus);
      const trackingUrl = "https://rastreamento.correios.com.br/app/index.php";

      // Generate dynamic sections based on status
      let trackingSection = "";
      let confirmationSection = "";
      let reviewSection = "";

      // Tracking section - show if tracking code exists
      if (data.trackingCode) {
        trackingSection = `
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 0 0 10px 0;"><strong>🚚 Código de Rastreamento:</strong></p>
            <p style="margin: 0; font-family: monospace; font-size: 18px; letter-spacing: 1px;">${data.trackingCode}</p>
            <a href="${trackingUrl}" style="display: inline-block; margin-top: 10px; color: #059669; text-decoration: underline;">Rastrear Pedido</a>
          </div>
        `;
      }

      // Confirmation section - show for shipped status (use token-based URL)
      if (data.newStatus === "shipped") {
        const confirmUrl = await generateConfirmReceiptUrl(supabaseAdmin, data.orderId);
        confirmationSection = `
          <div style="text-align: center; margin: 20px 0;">
            <p style="color: #666;">Já recebeu? Confirme para nós:</p>
            <a href="${confirmUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">✅ Recebi meu Pedido</a>
          </div>
        `;
      }

      // Calculate lighter color for gradient
      const colorLight = statusInfo.color.replace("#", "");
      const r = Math.min(255, parseInt(colorLight.substr(0, 2), 16) + 40)
        .toString(16)
        .padStart(2, "0");
      const g = Math.min(255, parseInt(colorLight.substr(2, 2), 16) + 40)
        .toString(16)
        .padStart(2, "0");
      const b = Math.min(255, parseInt(colorLight.substr(4, 2), 16) + 40)
        .toString(16)
        .padStart(2, "0");
      const statusColorLight = `#${r}${g}${b}`;

      const variables: Record<string, string> = {
        customer_name: data.customerName,
        order_id: data.orderId.substring(0, 8).toUpperCase(),
        status_label: statusInfo.label,
        status_emoji: statusInfo.emoji,
        status_color: statusInfo.color,
        status_color_light: statusColorLight,
        status_message: statusInfo.message,
        tracking_code: data.trackingCode || "",
        tracking_section: trackingSection,
        confirmation_section: confirmationSection,
        review_section: reviewSection,
        store_name: "Cali Brasil",
        store_email: "oi@calibrasil.com",
      };

      emailContent = await generateEmailFromTemplate(supabaseAdmin, data, "order_status_update", variables);
    }

    // Using verified domain calibrasil.com for transactional emails
    const emailResult = await resend.emails.send({
      from: "Cali Brasil <pedidos@calibrasil.com>",
      to: [data.customerEmail],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("[ORDER-STATUS] Email sent successfully");

    return new Response(JSON.stringify({ success: true, emailResult }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[ORDER-STATUS] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
