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
  test?: boolean; // Test mode - only check connectivity
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

interface SigepCredentials {
  user: string;
  password: string;
  cnpj: string;
  contractCode: string;
  cardCode: string;
  adminCode: string;
  environment: "production" | "homologation";
}

interface CredentialStatus {
  configured: boolean;
  environment: string;
  details: {
    user: boolean;
    password: boolean;
    cnpj: boolean;
    contractCode: boolean;
    cardCode: boolean;
    adminCode: boolean;
  };
}

function maskSecret(value: string | undefined): string {
  if (!value) return "(não configurado)";
  if (value.length <= 4) return "****";
  return value.substring(0, 2) + "***" + value.substring(value.length - 2);
}

function getSigepCredentials(): SigepCredentials | null {
  const user = Deno.env.get("SIGEP_USER");
  const password = Deno.env.get("SIGEP_PASSWORD");
  const cnpj = Deno.env.get("SIGEP_CNPJ");
  const contractCode = Deno.env.get("SIGEP_CONTRACT_CODE");
  const cardCode = Deno.env.get("SIGEP_CARD_CODE");
  const adminCode = Deno.env.get("SIGEP_ADMINISTRATIVE_CODE");
  const environment = (Deno.env.get("SIGEP_ENVIRONMENT") || "homologation") as "production" | "homologation";

  // Log credential status with masked values
  console.log("[SIGEP] === Status das Credenciais ===");
  console.log(`  - SIGEP_USER: ${maskSecret(user)}`);
  console.log(`  - SIGEP_PASSWORD: ${password ? "✓ (configurado)" : "✗ (vazio)"}`);
  console.log(`  - SIGEP_CNPJ: ${maskSecret(cnpj)}`);
  console.log(`  - SIGEP_CONTRACT_CODE: ${maskSecret(contractCode)}`);
  console.log(`  - SIGEP_CARD_CODE: ${maskSecret(cardCode)}`);
  console.log(`  - SIGEP_ADMINISTRATIVE_CODE: ${maskSecret(adminCode)}`);
  console.log(`  - SIGEP_ENVIRONMENT: ${environment}`);

  // Check if all required credentials are present
  if (!user || !password || !cnpj || !contractCode || !cardCode || !adminCode) {
    console.log("[SIGEP] ⚠️ Credenciais incompletas - usando modo simulado");
    return null;
  }

  // Validate CNPJ format (14 digits)
  const cnpjClean = cnpj.replace(/\D/g, "");
  if (cnpjClean.length !== 14) {
    console.log(`[SIGEP] ⚠️ CNPJ inválido: ${cnpj} (deve ter 14 dígitos, tem ${cnpjClean.length})`);
    return null;
  }

  console.log(`[SIGEP] ✓ Credenciais OK. Ambiente: ${environment.toUpperCase()}`);
  return { user, password, cnpj: cnpjClean, contractCode, cardCode, adminCode, environment };
}

function getCredentialStatus(): CredentialStatus {
  const user = Deno.env.get("SIGEP_USER");
  const password = Deno.env.get("SIGEP_PASSWORD");
  const cnpj = Deno.env.get("SIGEP_CNPJ");
  const contractCode = Deno.env.get("SIGEP_CONTRACT_CODE");
  const cardCode = Deno.env.get("SIGEP_CARD_CODE");
  const adminCode = Deno.env.get("SIGEP_ADMINISTRATIVE_CODE");
  const environment = Deno.env.get("SIGEP_ENVIRONMENT") || "homologation";

  const allConfigured = !!(user && password && cnpj && contractCode && cardCode && adminCode);

  return {
    configured: allConfigured,
    environment: allConfigured ? environment : "simulated",
    details: {
      user: !!user,
      password: !!password,
      cnpj: !!cnpj,
      contractCode: !!contractCode,
      cardCode: !!cardCode,
      adminCode: !!adminCode,
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. Parse body
    const body: GenerateLabelRequest = await req.json();
    const { orderId, serviceType = "PAC", weight = 0.5, declaredValue, test = false } = body;

    // === TEST MODE: Only check connectivity ===
    if (test) {
      console.log("[SIGEP-TEST] Iniciando teste de conectividade...");
      
      const credentialStatus = getCredentialStatus();
      const credentials = getSigepCredentials();
      
      if (!credentials) {
        return new Response(
          JSON.stringify({
            success: true,
            test: true,
            connected: false,
            credentialStatus,
            message: "Credenciais SIGEP incompletas. Modo simulado ativo.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try to connect to SIGEP
      const connectivityResult = await testSigepConnectivity(credentials);

      return new Response(
        JSON.stringify({
          success: true,
          test: true,
          connected: connectivityResult.connected,
          credentialStatus,
          sigepResponse: connectivityResult.message,
          environment: credentials.environment,
          wsdlUrl: credentials.environment === "production"
            ? "https://apps.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente"
            : "https://apphom.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === NORMAL MODE: Generate label ===
    if (!orderId) {
      throw new Error("orderId é obrigatório");
    }

    console.log(`[SIGEP-LABEL] Iniciando geração para pedido ${orderId}, serviço: ${serviceType}`);

    // 3. Get order data
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[SIGEP-LABEL] Pedido não encontrado:", orderError);
      throw new Error("Pedido não encontrado");
    }

    // 4. Get customer profile
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

    // 5. Validate address
    const shippingAddress = order.shipping_address as ShippingAddress | null;
    const validationErrors = validateOrderData(order, shippingAddress);
    
    if (validationErrors.length > 0) {
      console.error("[SIGEP-LABEL] Erros de validação:", validationErrors);
      throw new Error(`Dados incompletos: ${validationErrors.join("; ")}`);
    }

    const recipientZip = (shippingAddress!.zip || shippingAddress!.cep || "").replace(/\D/g, "");

    // 6. Get SIGEP credentials
    const credentials = getSigepCredentials();

    // 7. Determine service code
    const serviceCode = serviceType === "SEDEX" ? "04162" : "04510"; // SEDEX or PAC

    // 8. Generate label (simulated or real)
    let trackingCode: string;
    let etiquetaNumber: string;
    let xmlRequest = "";
    let xmlResponse = "";
    let isSimulated = false;
    let errorDetails: string | null = null;

    if (credentials) {
      // Real mode: call SIGEP Web
      console.log(`[SIGEP-LABEL] Chamando SIGEP Web (${credentials.environment.toUpperCase()})...`);
      
      const sigepResult = await callSigepWebService({
        credentials,
        serviceCode,
      });
      
      trackingCode = sigepResult.trackingCode;
      etiquetaNumber = sigepResult.etiquetaNumber;
      xmlRequest = sigepResult.xmlRequest;
      xmlResponse = sigepResult.xmlResponse;
      isSimulated = sigepResult.isSimulated;
      errorDetails = sigepResult.errorDetails;
    } else {
      // Simulated mode for development
      console.log("[SIGEP-LABEL] Modo simulado (credenciais incompletas)");
      const prefix = serviceType === "SEDEX" ? "NX" : "PM";
      const randomNum = Math.floor(Math.random() * 900000000) + 100000000;
      trackingCode = `${prefix}${randomNum}BR`;
      etiquetaNumber = `${prefix} ${String(randomNum).substring(0, 3)} ${String(randomNum).substring(3, 6)} ${String(randomNum).substring(6)} BR`;
      isSimulated = true;
    }

    console.log(`[SIGEP-LABEL] Etiqueta gerada: ${trackingCode} (simulado: ${isSimulated})`);

    // 9. Update order
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        tracking_code: trackingCode,
        label_generated: true,
        label_generated_at: new Date().toISOString(),
        shipping_method: serviceType,
        sigep_etiqueta: etiquetaNumber,
        shipping_weight: weight,
        declared_value: declaredValue || order.total,
        status: order.status === "processing" ? "shipped" : order.status,
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[SIGEP-LABEL] Erro ao atualizar pedido:", updateError);
      throw new Error("Erro ao atualizar pedido");
    }

    // 10. Create shipping_labels record
    const { error: labelError } = await supabase
      .from("shipping_labels")
      .insert({
        order_id: orderId,
        tracking_code: trackingCode,
        label_number: etiquetaNumber,
        service_type: serviceType,
        weight,
        declared_value: declaredValue || order.total,
        xml_request: xmlRequest,
        xml_response: xmlResponse,
      });

    if (labelError) {
      console.error("[SIGEP-LABEL] Erro ao criar registro de etiqueta:", labelError);
    }

    // 11. Get sender data
    const { data: storeSettings } = await supabase
      .from("store_settings")
      .select("store_name, store_pickup_address")
      .limit(1)
      .maybeSingle();

    const senderName = storeSettings?.store_name || "Cali Beach Tech";
    const senderAddress = storeSettings?.store_pickup_address || "Shopping RioMar, Av. República do Líbano, 251 - Piso L1, Recife - PE";
    const senderCep = Deno.env.get("CORREIOS_CEP_ORIGEM") || "51110-160";

    // 12. Build recipient name
    const recipientName = shippingAddress!.name || 
      `${shippingAddress!.firstName || ''} ${shippingAddress!.lastName || ''}`.trim() || 
      customerName || 
      "Destinatário";

    // 13. Determine environment for response
    const environment = credentials?.environment || "simulated";

    // 14. Return data for frontend label generation
    return new Response(
      JSON.stringify({
        success: true,
        trackingCode,
        etiquetaNumber,
        environment,
        isSimulated,
        errorDetails,
        sender: {
          name: senderName,
          address: senderAddress,
          city: "Recife",
          state: "PE",
          zipcode: senderCep,
          phone: "",
        },
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
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[SIGEP-LABEL] Erro:", error);
    console.error("[SIGEP-LABEL] Stack:", error.stack);
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

// === Test SIGEP Connectivity ===
async function testSigepConnectivity(credentials: SigepCredentials): Promise<{ connected: boolean; message: string }> {
  const wsdlUrl = credentials.environment === "production"
    ? "https://apps.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente"
    : "https://apphom.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente";

  // Test with buscaCliente operation (doesn't consume label quota)
  const soapXML = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cli="http://cliente.bean.master.sigep.bsb.correios.com.br/">
  <soapenv:Header/>
  <soapenv:Body>
    <cli:buscaCliente>
      <idContrato>${credentials.contractCode}</idContrato>
      <idCartaoPostagem>${credentials.cardCode}</idCartaoPostagem>
      <usuario>${credentials.user}</usuario>
      <senha>${credentials.password}</senha>
    </cli:buscaCliente>
  </soapenv:Body>
</soapenv:Envelope>`;

  console.log(`[SIGEP-TEST] Testando conexão com: ${wsdlUrl}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(wsdlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "buscaCliente",
      },
      body: soapXML,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log(`[SIGEP-TEST] Status: ${response.status}`);

    if (responseText.includes("faultstring") || responseText.includes("Fault")) {
      const faultMatch = responseText.match(/<faultstring>(.*?)<\/faultstring>/);
      const errorMsg = faultMatch ? faultMatch[1] : "Erro desconhecido";
      console.log(`[SIGEP-TEST] ❌ Erro SOAP: ${errorMsg}`);
      return { connected: false, message: `Erro de autenticação: ${errorMsg}` };
    }

    if (response.ok && responseText.includes("return")) {
      console.log("[SIGEP-TEST] ✓ Conexão OK");
      return { connected: true, message: "Conexão estabelecida com sucesso!" };
    }

    return { connected: false, message: `Resposta inesperada: ${response.status}` };
  } catch (error: any) {
    console.error("[SIGEP-TEST] ❌ Erro de conexão:", error.message);
    
    if (error.name === "AbortError") {
      return { connected: false, message: "Timeout: Servidor SIGEP não respondeu em 30 segundos" };
    }
    
    return { connected: false, message: `Erro de rede: ${error.message}` };
  }
}

// === Call SIGEP Web Service ===
interface SigepCallConfig {
  credentials: SigepCredentials;
  serviceCode: string;
}

interface SigepResult {
  trackingCode: string;
  etiquetaNumber: string;
  xmlRequest: string;
  xmlResponse: string;
  isSimulated: boolean;
  errorDetails: string | null;
}

async function callSigepWebService(config: SigepCallConfig): Promise<SigepResult> {
  const { credentials, serviceCode } = config;
  
  const wsdlUrl = credentials.environment === "production"
    ? "https://apps.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente"
    : "https://apphom.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente";

  // SOAP XML to request label
  const soapXML = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cli="http://cliente.bean.master.sigep.bsb.correios.com.br/">
  <soapenv:Header/>
  <soapenv:Body>
    <cli:solicitaEtiquetas>
      <tipoDestinatario>C</tipoDestinatario>
      <identificador>${credentials.cnpj}</identificador>
      <idServico>${serviceCode}</idServico>
      <qtdEtiquetas>1</qtdEtiquetas>
      <usuario>${credentials.user}</usuario>
      <senha>${credentials.password}</senha>
    </cli:solicitaEtiquetas>
  </soapenv:Body>
</soapenv:Envelope>`;

  console.log(`[SIGEP] === Requisição SIGEP ===`);
  console.log(`[SIGEP] URL: ${wsdlUrl}`);
  console.log(`[SIGEP] Usuário: ${credentials.user}`);
  console.log(`[SIGEP] CNPJ: ${maskSecret(credentials.cnpj)}`);
  console.log(`[SIGEP] Código de Serviço: ${serviceCode}`);
  console.log(`[SIGEP] Ambiente: ${credentials.environment.toUpperCase()}`);

  const maxRetries = 2;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[SIGEP] Tentativa ${attempt}/${maxRetries}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(wsdlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "SOAPAction": "solicitaEtiquetas",
        },
        body: soapXML,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      console.log(`[SIGEP] Status HTTP: ${response.status}`);
      console.log(`[SIGEP] Resposta (primeiros 500 chars): ${responseText.substring(0, 500)}`);

      if (!response.ok) {
        console.error(`[SIGEP] ❌ Erro HTTP: ${response.status}`);
        lastError = `Erro HTTP ${response.status}`;
        continue; // Retry
      }

      // Check for SOAP fault
      if (responseText.includes("faultstring") || responseText.includes("Fault")) {
        const faultMatch = responseText.match(/<faultstring>(.*?)<\/faultstring>/);
        const errorMsg = faultMatch ? faultMatch[1] : "Erro desconhecido";
        console.error(`[SIGEP] ❌ Erro SOAP: ${errorMsg}`);
        lastError = errorMsg;
        
        // Don't retry for authentication errors
        if (errorMsg.toLowerCase().includes("senha") || errorMsg.toLowerCase().includes("usuario") || errorMsg.toLowerCase().includes("autenticacao")) {
          break;
        }
        continue;
      }

      // Extract label number from response
      const etiquetaMatch = responseText.match(/<return>(.*?)<\/return>/);
      if (!etiquetaMatch || !etiquetaMatch[1]) {
        console.error("[SIGEP] ❌ Etiqueta não encontrada na resposta");
        console.error(`[SIGEP] Resposta completa: ${responseText}`);
        lastError = "Etiqueta não encontrada na resposta";
        continue;
      }

      const etiquetaNumber = etiquetaMatch[1].trim();
      const trackingCode = etiquetaNumber.replace(/\s/g, "");

      console.log(`[SIGEP] ✓ Etiqueta obtida: ${trackingCode}`);

      return {
        trackingCode,
        etiquetaNumber,
        xmlRequest: soapXML,
        xmlResponse: responseText,
        isSimulated: false,
        errorDetails: null,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[SIGEP] ❌ Erro na tentativa ${attempt}: ${errorMessage}`);
      
      if (error instanceof Error && error.name === "AbortError") {
        lastError = "Timeout: servidor não respondeu em 30 segundos";
      } else {
        lastError = errorMessage;
      }
      
      if (attempt < maxRetries) {
        console.log(`[SIGEP] Aguardando 2s antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // Fallback to simulated mode
  console.log(`[SIGEP] ⚠️ Usando fallback simulado após ${maxRetries} tentativas`);
  console.log(`[SIGEP] Último erro: ${lastError}`);
  
  const prefix = serviceCode === "04162" ? "NX" : "PM";
  const randomNum = Math.floor(Math.random() * 900000000) + 100000000;
  const trackingCode = `${prefix}${randomNum}BR`;
  const etiquetaNumber = `${prefix} ${String(randomNum).substring(0, 3)} ${String(randomNum).substring(3, 6)} ${String(randomNum).substring(6)} BR`;
  
  return {
    trackingCode,
    etiquetaNumber,
    xmlRequest: soapXML,
    xmlResponse: `ERRO: ${lastError}`,
    isSimulated: true,
    errorDetails: lastError,
  };
}
