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

  // Use token-based confirmation URL (works without auth, no blank screen issues)
  const confirmUrl = await generateConfirmReceiptUrl(supabase, data.orderId);

  const subject = data.newStatus === "shipped" 
    ? `🚚 Seu pedido está a caminho! #${data.orderId.substring(0, 8).toUpperCase()}`
    : `${statusInfo.emoji} Seu pedido foi ${statusInfo.label.toLowerCase()}! #${data.orderId.substring(0, 8).toUpperCase()}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calibrasil - Atualização do Pedido</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Calibrasil</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #FFD700; font-weight: 500;">Estilo beach-tech 🏖️</p>
            </td>
          </tr>

          <!-- Status badge -->
          <tr>
            <td style="padding: 32px 24px 16px; text-align: center;">
              <div style="display: inline-block; background: ${statusInfo.color}; color: white; padding: 10px 20px; border-radius: 24px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">
                ${statusInfo.emoji} ${statusInfo.label.toUpperCase()}
              </div>
            </td>
          </tr>

          <!-- Greeting and message -->
          <tr>
            <td style="padding: 0 24px 24px; text-align: center;">
              <h2 style="font-size: 22px; font-weight: 600; margin: 16px 0 8px 0; color: #1a1a1a;">
                ${data.newStatus === "shipped" ? "Seu pedido está a caminho! 🚚" : `Olá, ${escapeHtml(data.customerName)}!`}
              </h2>
              <p style="font-size: 16px; color: #666; margin: 0; line-height: 1.6;">
                ${statusInfo.message}
              </p>
            </td>
          </tr>

          <!-- Order info box -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <div style="background: #fafafa; border-radius: 12px; padding: 20px; border: 1px solid #eee;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #888;">Número do Pedido</p>
                <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1a1a1a; letter-spacing: 1px;">
                  #${data.orderId.substring(0, 8).toUpperCase()}
                </p>
                ${
                  data.trackingCode
                    ? `
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed #ddd;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #888;">Código de Rastreamento</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a; font-family: monospace; background: #fff; padding: 8px 12px; border-radius: 6px; display: inline-block;">
                      ${escapeHtml(data.trackingCode)}
                    </p>
                    <p style="margin: 12px 0 0 0;">
                      <a href="https://rastreamento.correios.com.br/app/index.php" target="_blank" style="color: #8b5cf6; text-decoration: none; font-size: 14px; font-weight: 500;">
                        📍 Rastrear nos Correios →
                      </a>
                    </p>
                  </div>
                `
                    : ""
                }
              </div>
            </td>
          </tr>

          <!-- CTA Button - Only for shipped/delivered -->
          ${
            data.newStatus === "shipped" || data.newStatus === "delivered"
              ? `
            <tr>
              <td style="padding: 0 24px 32px; text-align: center;">
                <p style="font-size: 15px; color: #666; margin: 0 0 20px 0;">
                  ${data.newStatus === "shipped" ? "Recebeu seu pedido? Confirme para nós!" : "Confirme o recebimento e avalie:"}
                </p>
                <a href="${confirmUrl}" target="_blank" rel="noopener noreferrer"
                   style="display: inline-block; background: #FFD700; color: #1a1a1a; text-decoration: none;
                   padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px;
                   box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4); transition: all 0.3s ease;">
                   ✅ Confirmar Recebimento
                </a>
                <p style="font-size: 12px; color: #999; margin: 16px 0 0 0;">
                  Link válido por 7 dias
                </p>
              </td>
            </tr>
          `
              : ""
          }

          <!-- Footer -->
          <tr>
            <td style="background: #fafafa; padding: 24px; text-align: center; border-top: 1px solid #eee;">
              <p style="font-size: 14px; color: #888; margin: 0 0 8px 0;">
                Obrigado por escolher a Calibrasil 💛
              </p>
              <p style="font-size: 13px; color: #aaa; margin: 0 0 12px 0;">
                Dúvidas? <a href="mailto:oi@calibrasil.com" style="color: #E63946; text-decoration: none;">oi@calibrasil.com</a>
              </p>
              <p style="font-size: 11px; color: #bbb; margin: 0;">
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Client for template fetch and token creation (service role to bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check for internal call via secret header (from generate-sigep-label)
    const internalSecret = req.headers.get("x-internal-secret");
    const expectedSecret = Deno.env.get("INTERNAL_API_SECRET");
    const isInternalCall = internalSecret && expectedSecret && internalSecret === expectedSecret;
    
    if (isInternalCall) {
      console.log("[ORDER-STATUS] Chamada interna autorizada via x-internal-secret");
    } else {
      // SECURITY: Verify the user is an admin or manager
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        console.error("[ORDER-STATUS] No authorization header");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Client for auth check (user context)
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
        global: { headers: { Authorization: authHeader } },
      });

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
