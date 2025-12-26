import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify internal secret OR allow from diagnostic panel
    const internalSecret = req.headers.get("x-internal-secret");
    const expectedSecret = Deno.env.get("INTERNAL_API_SECRET");
    
    // Allow 'test-from-diagnostic' for diagnostic panel testing
    const isValidSecret = internalSecret === expectedSecret || internalSecret === 'test-from-diagnostic';
    
    if (!isValidSecret) {
      console.error("[TEST-RESEND-EMAIL] Unauthorized: Invalid or missing internal secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { to, useResendDomain } = await req.json();
    
    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    console.log("[TEST-RESEND-EMAIL] RESEND_API_KEY exists:", !!resendApiKey);
    console.log("[TEST-RESEND-EMAIL] RESEND_API_KEY length:", resendApiKey?.length || 0);
    
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);
    
    // Use either custom domain or Resend's test domain
    const fromEmail = useResendDomain 
      ? "Cali Brasil Test <onboarding@resend.dev>"
      : "Cali Brasil <pedidos@calibrasil.com>";
    
    console.log("[TEST-RESEND-EMAIL] Sending test email...");
    console.log("[TEST-RESEND-EMAIL] From:", fromEmail);
    console.log("[TEST-RESEND-EMAIL] To:", to);
    
    const result = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: "🧪 Teste de Email - Cali Brasil",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px; background: #16a34a; color: white; border-radius: 8px;">
            <h1 style="margin: 0;">✅ Email Funcionando!</h1>
          </div>
          <div style="padding: 20px; background: #f9fafb; margin-top: 20px; border-radius: 8px;">
            <p><strong>Este é um email de teste.</strong></p>
            <p>Se você recebeu este email, significa que a integração com Resend está funcionando corretamente.</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Enviado em: ${new Date().toLocaleString('pt-BR')}<br>
              Remetente: ${fromEmail}<br>
              Destinatário: ${to}
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("[TEST-RESEND-EMAIL] Full result:", JSON.stringify(result));
    
    if (result.error) {
      console.error("[TEST-RESEND-EMAIL] Resend error:", JSON.stringify(result.error));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error,
          details: {
            fromEmail,
            to,
            message: "Resend returned an error. Check if domain is verified."
          }
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[TEST-RESEND-EMAIL] Email sent successfully. ID:", result.data?.id);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: result.data?.id,
        from: fromEmail,
        to: to,
        message: "Email enviado com sucesso! Verifique sua caixa de entrada (e spam)."
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[TEST-RESEND-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
