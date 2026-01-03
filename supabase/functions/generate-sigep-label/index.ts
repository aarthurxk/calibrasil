import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateLabelRequest {
  orderId?: string;
  serviceType?: "PAC" | "SEDEX";
  weight?: number;
  declaredValue?: number;
  test?: boolean;
  offline?: boolean;
}

interface ShippingAddress {
  firstName?: string;
  lastName?: string;
  name?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
  cep?: string;
}

interface CwsCredentials {
  user: string;
  password: string;
  contract: string;
  card: string;
  environment: "production" | "homologation";
}

interface CredentialStatus {
  configured: boolean;
  environment: string;
  apiType: "cws" | "sigep" | "none";
  details: {
    user: boolean;
    password: boolean;
    contract: boolean;
    card: boolean;
  };
}

function maskSecret(value: string | undefined): string {
  if (!value) return "(não configurado)";
  if (value.length <= 4) return "****";
  return value.substring(0, 2) + "***" + value.substring(value.length - 2);
}

function getCwsCredentials(): CwsCredentials | null {
  const user = Deno.env.get("CWS_USER");
  const password = Deno.env.get("CWS_PASSWORD");
  const contract = Deno.env.get("CWS_CONTRACT");
  const card = Deno.env.get("CWS_CARD");
  const environment = (Deno.env.get("CWS_ENVIRONMENT") || "homologation") as "production" | "homologation";

  console.log("[CWS] === Status das Credenciais CWS ===");
  console.log(`  - CWS_USER: ${maskSecret(user)}`);
  console.log(`  - CWS_PASSWORD: ${password ? "✓ (configurado)" : "✗ (vazio)"}`);
  console.log(`  - CWS_CONTRACT: ${maskSecret(contract)}`);
  console.log(`  - CWS_CARD: ${maskSecret(card)}`);
  console.log(`  - CWS_ENVIRONMENT: ${environment}`);

  if (!user || !password || !contract || !card) {
    console.log("[CWS] ⚠️ Credenciais CWS incompletas");
    return null;
  }

  console.log(`[CWS] ✓ Credenciais CWS OK. Ambiente: ${environment.toUpperCase()}`);
  return { user, password, contract, card, environment };
}

function getCredentialStatus(): CredentialStatus {
  const user = Deno.env.get("CWS_USER");
  const password = Deno.env.get("CWS_PASSWORD");
  const contract = Deno.env.get("CWS_CONTRACT");
  const card = Deno.env.get("CWS_CARD");
  const environment = Deno.env.get("CWS_ENVIRONMENT") || "homologation";

  const allConfigured = !!(user && password && contract && card);

  return {
    configured: allConfigured,
    environment: allConfigured ? environment : "simulated",
    apiType: allConfigured ? "cws" : "none",
    details: {
      user: !!user,
      password: !!password,
      contract: !!contract,
      card: !!card,
    },
  };
}

function validateOrderData(order: any, shippingAddress: ShippingAddress | null): string[] {
  const errors: string[] = [];

  if (!shippingAddress) {
    errors.push("Endereço de entrega não informado");
    return errors;
  }

  const zip = shippingAddress.zip || shippingAddress.cep || "";
  const zipClean = zip.replace(/\D/g, "");
  if (!zipClean || zipClean.length !== 8) {
    errors.push(`CEP inválido: "${zip}" (deve ter 8 dígitos)`);
  }

  if (!shippingAddress.street) {
    errors.push("Rua não informada");
  }

  if (!shippingAddress.city) {
    errors.push("Cidade não informada");
  }

  if (!shippingAddress.state) {
    errors.push("Estado não informado");
  }

  const recipientName = shippingAddress.name || 
    `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim();
  if (!recipientName) {
    errors.push("Nome do destinatário não informado");
  }

  return errors;
}

// === CWS Authentication ===
interface CwsToken {
  token: string;
  expiresAt: Date;
}

async function getCwsToken(credentials: CwsCredentials): Promise<CwsToken | null> {
  const baseUrl = credentials.environment === "production"
    ? "https://api.correios.com.br"
    : "https://apihom.correios.com.br";

  const authUrl = `${baseUrl}/token/v1/autentica/cartaopostagem`;
  
  // Basic auth: user:password in base64
  const basicAuth = btoa(`${credentials.user}:${credentials.password}`);
  
  console.log(`[CWS-AUTH] Autenticando em: ${authUrl}`);
  console.log(`[CWS-AUTH] Usuário: ${credentials.user}`);
  
  try {
    const requestBody = JSON.stringify({ numero: credentials.card });
    
    console.log(`[CWS-AUTH] Request body: ${requestBody}`);
    console.log(`[CWS-AUTH] Headers: Authorization=Basic *****, Content-Type=application/json`);
    
    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: requestBody,
    });

    console.log(`[CWS-AUTH] Status: ${response.status}`);
    console.log(`[CWS-AUTH] Status Text: ${response.statusText}`);
    
    // Log response headers for debugging
    const headersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    console.log(`[CWS-AUTH] Response Headers: ${JSON.stringify(headersObj)}`);
    
    const responseText = await response.text();
    console.log(`[CWS-AUTH] Response Body (first 1000 chars): ${responseText.substring(0, 1000)}`);
    
    if (!response.ok) {
      console.error(`[CWS-AUTH] ❌ Erro de autenticação: ${response.status}`);
      
      // Parse error details if JSON
      try {
        const errorData = JSON.parse(responseText);
        console.error(`[CWS-AUTH] ❌ Erro JSON: ${JSON.stringify(errorData, null, 2)}`);
        console.error(`[CWS-AUTH] ❌ Mensagem: ${errorData.msg || errorData.message || errorData.error || 'Sem mensagem'}`);
        console.error(`[CWS-AUTH] ❌ Código: ${errorData.cod || errorData.code || 'Sem código'}`);
      } catch {
        console.error(`[CWS-AUTH] ❌ Resposta não é JSON: ${responseText}`);
      }
      
      // Specific guidance for 401 errors
      if (response.status === 401) {
        console.error(`[CWS-AUTH] ⚠️ DICA: Erro 401 geralmente significa:`);
        console.error(`[CWS-AUTH]   1. CWS_USER deve ser o 'idCorreios' (login do Meu Correios), não o CNPJ`);
        console.error(`[CWS-AUTH]   2. CWS_PASSWORD deve ser o código de acesso gerado no portal CWS`);
        console.error(`[CWS-AUTH]   3. Verifique se as credenciais são do ambiente correto (${credentials.environment})`);
      }
      
      return null;
    }

    const data = JSON.parse(responseText);
    
    if (!data.token) {
      console.error("[CWS-AUTH] ❌ Token não encontrado na resposta");
      console.error(`[CWS-AUTH] ❌ Resposta completa: ${JSON.stringify(data, null, 2)}`);
      return null;
    }

    // Token expira em ~1h, mas usamos margem de 55min
    const expiresAt = new Date(Date.now() + 55 * 60 * 1000);
    
    console.log("[CWS-AUTH] ✓ Token obtido com sucesso");
    console.log(`[CWS-AUTH] ✓ Expira em: ${expiresAt.toISOString()}`);
    return { token: data.token, expiresAt };
  } catch (error: any) {
    console.error(`[CWS-AUTH] ❌ Erro de conexão: ${error.message}`);
    console.error(`[CWS-AUTH] ❌ Stack: ${error.stack}`);
    return null;
  }
}

// === Test CWS Connectivity ===
interface ConnectivityResult {
  connected: boolean;
  message: string;
  httpStatus?: number;
  environment?: string;
  apiType?: string;
  details?: any;
}

async function testCwsConnectivity(credentials: CwsCredentials): Promise<ConnectivityResult> {
  const tokenResult = await getCwsToken(credentials);
  
  if (!tokenResult) {
    return {
      connected: false,
      message: "Falha na autenticação CWS. Verifique usuário e código de acesso.",
      environment: credentials.environment,
      apiType: "cws",
    };
  }

  return {
    connected: true,
    message: "Conexão CWS estabelecida com sucesso!",
    environment: credentials.environment,
    apiType: "cws",
    details: {
      tokenObtained: true,
      expiresAt: tokenResult.expiresAt.toISOString(),
    },
  };
}

// === CWS Pre-Posting API ===
interface PrePostingResult {
  trackingCode: string;
  etiquetaNumber: string;
  isSimulated: boolean;
  errorDetails: string | null;
}

async function createCwsPrePosting(
  credentials: CwsCredentials, 
  token: string,
  serviceCode: string,
  order: any,
  shippingAddress: ShippingAddress,
  senderData: any,
  weight: number,
  declaredValue: number
): Promise<PrePostingResult> {
  const baseUrl = credentials.environment === "production"
    ? "https://api.correios.com.br"
    : "https://apihom.correios.com.br";

  const apiUrl = `${baseUrl}/prepostagem/v1/prepostagens`;

  const recipientName = shippingAddress.name || 
    `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() || 
    "Destinatário";
  
  const recipientZip = (shippingAddress.zip || shippingAddress.cep || "").replace(/\D/g, "");
  const senderZip = (senderData.zipcode || "").replace(/\D/g, "");

  // Build pre-posting request according to CWS API
  const prePostingData = {
    idCorreios: credentials.user,
    codigoServico: serviceCode,
    remetente: {
      nome: senderData.name,
      endereco: {
        cep: senderZip,
        logradouro: senderData.address?.split(",")[0] || senderData.address,
        numero: "S/N",
        bairro: senderData.neighborhood || "Centro",
        cidade: senderData.city,
        uf: senderData.state,
      },
    },
    destinatario: {
      nome: recipientName.substring(0, 60),
      endereco: {
        cep: recipientZip,
        logradouro: shippingAddress.street?.substring(0, 60) || "",
        numero: shippingAddress.number || "S/N",
        complemento: shippingAddress.complement?.substring(0, 30) || "",
        bairro: shippingAddress.neighborhood?.substring(0, 30) || "",
        cidade: shippingAddress.city?.substring(0, 40) || "",
        uf: shippingAddress.state || "",
      },
    },
    objetoPostal: {
      peso: Math.max(1, Math.round(weight * 1000)), // Weight in grams
      valorDeclarado: declaredValue > 0 ? Math.round(declaredValue * 100) : undefined, // Value in cents
    },
    codigoRastreio: "", // CWS will generate
  };

  console.log(`[CWS-PREPOSTAGEM] Criando pré-postagem...`);
  console.log(`[CWS-PREPOSTAGEM] URL: ${apiUrl}`);
  console.log(`[CWS-PREPOSTAGEM] Serviço: ${serviceCode}`);
  console.log(`[CWS-PREPOSTAGEM] Destinatário: ${recipientName}`);
  console.log(`[CWS-PREPOSTAGEM] CEP Destino: ${recipientZip}`);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(prePostingData),
    });

    console.log(`[CWS-PREPOSTAGEM] Status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`[CWS-PREPOSTAGEM] Resposta: ${responseText.substring(0, 500)}`);

    if (!response.ok) {
      console.error(`[CWS-PREPOSTAGEM] ❌ Erro: ${response.status}`);
      
      // Parse error message if available
      let errorMsg = `Erro HTTP ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMsg = errorData.msgs?.[0]?.texto || errorData.message || errorMsg;
      } catch {}
      
      return generateSimulatedLabel(serviceCode, errorMsg);
    }

    const data = JSON.parse(responseText);
    
    if (!data.codigoRastreio) {
      console.error("[CWS-PREPOSTAGEM] ❌ Código de rastreio não encontrado na resposta");
      return generateSimulatedLabel(serviceCode, "Código de rastreio não retornado");
    }

    const trackingCode = data.codigoRastreio;
    const etiquetaNumber = formatTrackingCode(trackingCode);

    console.log(`[CWS-PREPOSTAGEM] ✓ Etiqueta obtida: ${trackingCode}`);

    return {
      trackingCode,
      etiquetaNumber,
      isSimulated: false,
      errorDetails: null,
    };
  } catch (error: any) {
    console.error(`[CWS-PREPOSTAGEM] ❌ Erro de conexão: ${error.message}`);
    return generateSimulatedLabel(serviceCode, error.message);
  }
}

function generateSimulatedLabel(serviceCode: string, errorDetails: string): PrePostingResult {
  const prefix = serviceCode === "03220" || serviceCode === "04162" ? "NX" : "PM";
  const randomNum = Math.floor(Math.random() * 900000000) + 100000000;
  const trackingCode = `${prefix}${randomNum}BR`;
  const etiquetaNumber = formatTrackingCode(trackingCode);
  
  console.log(`[CWS] ⚠️ Usando fallback simulado: ${trackingCode}`);
  console.log(`[CWS] Motivo: ${errorDetails}`);
  
  return {
    trackingCode,
    etiquetaNumber,
    isSimulated: true,
    errorDetails,
  };
}

function formatTrackingCode(code: string): string {
  // Format: AB 123 456 789 BR
  const clean = code.replace(/\s/g, "");
  if (clean.length === 13) {
    return `${clean.substring(0, 2)} ${clean.substring(2, 5)} ${clean.substring(5, 8)} ${clean.substring(8, 11)} ${clean.substring(11)}`;
  }
  return code;
}

// === Main Handler ===
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: GenerateLabelRequest = await req.json();
    const { orderId, serviceType = "PAC", weight = 0.5, declaredValue, test = false, offline = false } = body;

    // === TEST MODE ===
    if (test) {
      console.log("[CWS-TEST] Iniciando teste de conectividade...");
      
      const credentialStatus = getCredentialStatus();
      const credentials = getCwsCredentials();
      
      if (!credentials) {
        return new Response(
          JSON.stringify({
            success: true,
            test: true,
            connected: false,
            credentialStatus,
            message: "Credenciais CWS não configuradas. Configure CWS_USER, CWS_PASSWORD, CWS_CONTRACT e CWS_CARD.",
            apiType: "cws",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const connectivityResult = await testCwsConnectivity(credentials);

      return new Response(
        JSON.stringify({
          success: true,
          test: true,
          connected: connectivityResult.connected,
          credentialStatus,
          message: connectivityResult.message,
          environment: credentials.environment,
          apiType: "cws",
          apiUrl: credentials.environment === "production"
            ? "https://api.correios.com.br"
            : "https://apihom.correios.com.br",
          details: connectivityResult.details,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === LABEL GENERATION ===
    if (!orderId) {
      throw new Error("orderId é obrigatório");
    }

    console.log(`[CWS-LABEL] Gerando etiqueta para pedido ${orderId}, serviço: ${serviceType}`);

    // Get order data
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[CWS-LABEL] Pedido não encontrado:", orderError);
      throw new Error("Pedido não encontrado");
    }

    // Get customer profile
    let customerName = "";
    let customerPhone = "";
    
    if (order.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", order.user_id)
        .maybeSingle();
      
      if (profile) {
        customerName = profile.full_name || "";
        customerPhone = profile.phone || "";
      }
    }

    // Validate address
    const shippingAddress = order.shipping_address as ShippingAddress | null;
    const validationErrors = validateOrderData(order, shippingAddress);
    
    if (validationErrors.length > 0) {
      console.error("[CWS-LABEL] Erros de validação:", validationErrors);
      throw new Error(`Dados incompletos: ${validationErrors.join("; ")}`);
    }

    const recipientZip = (shippingAddress!.zip || shippingAddress!.cep || "").replace(/\D/g, "");

    // Get sender data
    const { data: storeSettings } = await supabase
      .from("store_settings")
      .select("store_name, store_pickup_address")
      .limit(1)
      .maybeSingle();

    const senderName = storeSettings?.store_name || "Cali Beach Tech";
    const senderAddress = storeSettings?.store_pickup_address || "Shopping RioMar, Av. República do Líbano, 251 - Piso L1, Recife - PE";
    const senderCep = Deno.env.get("CORREIOS_CEP_ORIGEM") || "51110-160";

    const senderData = {
      name: senderName,
      address: senderAddress,
      city: "Recife",
      state: "PE",
      zipcode: senderCep,
      phone: "",
    };

    // CWS service codes: PAC = 03298, SEDEX = 03220
    const serviceCode = serviceType === "SEDEX" ? "03220" : "03298";

    // Generate label
    let result: PrePostingResult;
    let isOffline = false;

    if (offline) {
      console.log("[CWS-LABEL] Modo OFFLINE solicitado");
      const prefix = serviceType === "SEDEX" ? "NX" : "PM";
      const timestamp = Date.now().toString().slice(-9);
      result = {
        trackingCode: `OFFLINE-${prefix}${timestamp}`,
        etiquetaNumber: `${prefix} ${timestamp.substring(0, 3)} ${timestamp.substring(3, 6)} ${timestamp.substring(6)} BR`,
        isSimulated: true,
        errorDetails: null,
      };
      isOffline = true;
    } else {
      const credentials = getCwsCredentials();
      
      if (!credentials) {
        console.log("[CWS-LABEL] Credenciais CWS não configuradas - modo simulado");
        result = generateSimulatedLabel(serviceCode, "Credenciais CWS não configuradas");
      } else {
        // Get CWS token
        const tokenResult = await getCwsToken(credentials);
        
        if (!tokenResult) {
          console.log("[CWS-LABEL] Falha na autenticação CWS - modo simulado");
          result = generateSimulatedLabel(serviceCode, "Falha na autenticação CWS");
        } else {
          // Create pre-posting
          result = await createCwsPrePosting(
            credentials,
            tokenResult.token,
            serviceCode,
            order,
            shippingAddress!,
            senderData,
            weight,
            declaredValue || order.total
          );
        }
      }
    }

    console.log(`[CWS-LABEL] Etiqueta gerada: ${result.trackingCode} (simulado: ${result.isSimulated})`);

    // Update order
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        tracking_code: result.trackingCode,
        label_generated: true,
        label_generated_at: new Date().toISOString(),
        shipping_method: serviceType,
        sigep_etiqueta: result.etiquetaNumber,
        shipping_weight: weight,
        declared_value: declaredValue || order.total,
        status: order.status === "processing" ? "shipped" : order.status,
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[CWS-LABEL] Erro ao atualizar pedido:", updateError);
      throw new Error("Erro ao atualizar pedido");
    }

    // Create shipping_labels record
    const { error: labelError } = await supabase
      .from("shipping_labels")
      .insert({
        order_id: orderId,
        tracking_code: result.trackingCode,
        label_number: result.etiquetaNumber,
        service_type: serviceType,
        weight,
        declared_value: declaredValue || order.total,
        xml_request: "",
        xml_response: result.isSimulated ? `SIMULADO: ${result.errorDetails || "offline"}` : "CWS API",
      });

    if (labelError) {
      console.error("[CWS-LABEL] Erro ao criar registro de etiqueta:", labelError);
    }

    // Send tracking email
    let emailSent = false;
    let emailErrorMsg: string | null = null;
    
    if (order.shipping_method !== "pickup") {
      console.log("[CWS-LABEL] Enviando email de rastreio...");
      
      try {
        let customerEmail = order.guest_email;
        const shippingAddr = order.shipping_address as ShippingAddress | null;
        const emailRecipientName = shippingAddr?.name || 
          `${shippingAddr?.firstName || ''} ${shippingAddr?.lastName || ''}`.trim() || 
          customerName || "Cliente";
        
        if (!customerEmail && order.user_id) {
          const { data: authData } = await supabase.auth.admin.getUserById(order.user_id);
          customerEmail = authData?.user?.email || null;
        }
        
        if (customerEmail) {
          const internalSecret = Deno.env.get("INTERNAL_API_SECRET");
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
          
          if (internalSecret && supabaseUrl && supabaseAnonKey) {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-order-status-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseAnonKey}`,
                "x-internal-secret": internalSecret,
              },
              body: JSON.stringify({
                orderId: order.id,
                customerEmail,
                customerName: emailRecipientName,
                oldStatus: order.status,
                newStatus: "shipped",
                trackingCode: result.trackingCode,
              }),
            });
            
            const emailResult = await emailResponse.json();
            emailSent = emailResponse.ok && emailResult.success;
            
            if (!emailSent) {
              emailErrorMsg = emailResult.error || "Falha no envio";
            }
            
            console.log(`[CWS-LABEL] Email ${emailSent ? "✓ enviado" : "✗ falhou"}: ${customerEmail}`);
          }
        }
      } catch (err: any) {
        emailErrorMsg = err.message;
        console.error("[CWS-LABEL] Erro ao enviar email:", err);
      }
    }

    // Build recipient name for response
    const recipientName = shippingAddress!.name || 
      `${shippingAddress!.firstName || ''} ${shippingAddress!.lastName || ''}`.trim() || 
      customerName || "Destinatário";

    // Determine environment for response
    const credentials = getCwsCredentials();
    const environment = isOffline ? "offline" : (credentials?.environment || "simulated");

    return new Response(
      JSON.stringify({
        success: true,
        trackingCode: result.trackingCode,
        etiquetaNumber: result.etiquetaNumber,
        environment,
        isSimulated: result.isSimulated,
        isOffline,
        errorDetails: result.errorDetails,
        emailSent,
        emailError: emailErrorMsg,
        apiType: "cws",
        sender: senderData,
        receiver: {
          name: recipientName,
          address: `${shippingAddress!.street || ""}, ${shippingAddress!.number || ""}${shippingAddress!.complement ? ` - ${shippingAddress!.complement}` : ""}`,
          neighborhood: shippingAddress!.neighborhood || "",
          city: shippingAddress!.city || "",
          state: shippingAddress!.state || "",
          zipcode: recipientZip,
          phone: customerPhone || order.phone || "",
        },
        orderData: {
          orderId: order.id,
          weight,
          declaredValue: declaredValue || order.total,
          serviceType,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[CWS-LABEL] Erro:", error);
    console.error("[CWS-LABEL] Stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
