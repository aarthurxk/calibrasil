import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateLabelRequest {
  orderId: string;
  serviceType: "PAC" | "SEDEX";
  weight: number;
  declaredValue?: number;
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

function getSigepCredentials(): SigepCredentials | null {
  const user = Deno.env.get("SIGEP_USER");
  const password = Deno.env.get("SIGEP_PASSWORD");
  const cnpj = Deno.env.get("SIGEP_CNPJ");
  const contractCode = Deno.env.get("SIGEP_CONTRACT_CODE");
  const cardCode = Deno.env.get("SIGEP_CARD_CODE");
  const adminCode = Deno.env.get("SIGEP_ADMINISTRATIVE_CODE");
  const environment = (Deno.env.get("SIGEP_ENVIRONMENT") || "homologation") as "production" | "homologation";

  // Check if all required credentials are present
  if (!user || !password || !cnpj || !contractCode || !cardCode || !adminCode) {
    console.log("[SIGEP] Credenciais faltando:");
    console.log(`  - SIGEP_USER: ${user ? "✓" : "✗"}`);
    console.log(`  - SIGEP_PASSWORD: ${password ? "✓" : "✗"}`);
    console.log(`  - SIGEP_CNPJ: ${cnpj ? "✓" : "✗"}`);
    console.log(`  - SIGEP_CONTRACT_CODE: ${contractCode ? "✓" : "✗"}`);
    console.log(`  - SIGEP_CARD_CODE: ${cardCode ? "✓" : "✗"}`);
    console.log(`  - SIGEP_ADMINISTRATIVE_CODE: ${adminCode ? "✓" : "✗"}`);
    return null;
  }

  console.log(`[SIGEP] Credenciais configuradas. Ambiente: ${environment.toUpperCase()}`);
  return { user, password, cnpj, contractCode, cardCode, adminCode, environment };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. Parse body
    const { orderId, serviceType, weight, declaredValue }: GenerateLabelRequest = await req.json();

    console.log(`[SIGEP-LABEL] Iniciando geração para pedido ${orderId}, serviço: ${serviceType}`);

    // 3. Buscar dados do pedido
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[SIGEP-LABEL] Pedido não encontrado:", orderError);
      throw new Error("Pedido não encontrado");
    }

    // 4. Buscar perfil do cliente
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

    // 5. Validar endereço
    const shippingAddress = order.shipping_address as ShippingAddress | null;
    if (!shippingAddress) {
      throw new Error("Endereço de entrega incompleto");
    }

    const recipientZip = shippingAddress.zip || shippingAddress.cep || "";
    if (!recipientZip) {
      throw new Error("CEP do destinatário não informado");
    }

    // 6. Obter credenciais SIGEP
    const credentials = getSigepCredentials();

    // 7. Determinar código do serviço
    const serviceCode = serviceType === "SEDEX" ? "04162" : "04510"; // SEDEX ou PAC

    // 8. Gerar etiqueta (simulado ou real)
    let trackingCode: string;
    let etiquetaNumber: string;
    let xmlRequest = "";
    let xmlResponse = "";
    let isSimulated = false;

    if (credentials) {
      // Modo real: chamar SIGEP Web
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
    } else {
      // Modo simulado para desenvolvimento
      console.log("[SIGEP-LABEL] Modo simulado (credenciais incompletas)");
      const prefix = serviceType === "SEDEX" ? "NX" : "PM";
      const randomNum = Math.floor(Math.random() * 900000000) + 100000000;
      trackingCode = `${prefix}${randomNum}BR`;
      etiquetaNumber = `${prefix} ${String(randomNum).substring(0, 3)} ${String(randomNum).substring(3, 6)} ${String(randomNum).substring(6)} BR`;
      isSimulated = true;
    }

    console.log(`[SIGEP-LABEL] Etiqueta gerada: ${trackingCode} (simulado: ${isSimulated})`);

    // 9. Atualizar pedido
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

    // 10. Criar registro em shipping_labels
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
      // Não falhar, o pedido já foi atualizado
    }

    // 11. Buscar dados do remetente
    const { data: storeSettings } = await supabase
      .from("store_settings")
      .select("store_name, store_pickup_address")
      .limit(1)
      .maybeSingle();

    const senderName = storeSettings?.store_name || "Cali Beach Tech";
    const senderAddress = storeSettings?.store_pickup_address || "Shopping RioMar, Av. República do Líbano, 251 - Piso L1, Recife - PE";
    const senderCep = Deno.env.get("CORREIOS_CEP_ORIGEM") || "51110-160";

    // 12. Montar nome do destinatário
    const recipientName = shippingAddress.name || 
      `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() || 
      customerName || 
      "Destinatário";

    // 13. Determinar ambiente para resposta
    const environment = credentials?.environment || "simulated";

    // 14. Retornar dados para gerar etiqueta no frontend
    return new Response(
      JSON.stringify({
        success: true,
        trackingCode,
        etiquetaNumber,
        environment,
        isSimulated,
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
          address: `${shippingAddress.street || ""}, ${shippingAddress.number || ""}${shippingAddress.complement ? ` - ${shippingAddress.complement}` : ""}`,
          neighborhood: shippingAddress.neighborhood || "",
          city: shippingAddress.city || "",
          state: shippingAddress.state || "",
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
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper: Chamar SIGEP Web Service
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
}

async function callSigepWebService(config: SigepCallConfig): Promise<SigepResult> {
  const { credentials, serviceCode } = config;
  
  const wsdlUrl = credentials.environment === "production"
    ? "https://apps.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente"
    : "https://apphom.correios.com.br/SigepMasterJPA/AtendeClienteService/AtendeCliente";

  // XML SOAP para solicitar etiqueta
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

  console.log(`[SIGEP] Enviando requisição para: ${wsdlUrl}`);
  console.log(`[SIGEP] Usuário: ${credentials.user}`);
  console.log(`[SIGEP] CNPJ: ${credentials.cnpj}`);
  console.log(`[SIGEP] Código de Serviço: ${serviceCode}`);

  try {
    const response = await fetch(wsdlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "solicitaEtiquetas",
      },
      body: soapXML,
    });

    const responseText = await response.text();
    console.log("[SIGEP] Status:", response.status);

    if (!response.ok) {
      console.error("[SIGEP] Erro na resposta:", responseText);
      throw new Error(`Erro SIGEP: ${response.status}`);
    }

    // Verificar se há erro de autenticação
    if (responseText.includes("faultstring") || responseText.includes("Fault")) {
      const faultMatch = responseText.match(/<faultstring>(.*?)<\/faultstring>/);
      const errorMsg = faultMatch ? faultMatch[1] : "Erro desconhecido";
      console.error("[SIGEP] Erro SOAP:", errorMsg);
      throw new Error(`Erro SIGEP: ${errorMsg}`);
    }

    // Extrair número da etiqueta do XML de resposta
    const etiquetaMatch = responseText.match(/<return>(.*?)<\/return>/);
    if (!etiquetaMatch || !etiquetaMatch[1]) {
      console.error("[SIGEP] Etiqueta não encontrada na resposta:", responseText);
      throw new Error("Etiqueta não encontrada na resposta do SIGEP");
    }

    const etiquetaNumber = etiquetaMatch[1].trim();
    const trackingCode = etiquetaNumber.replace(/\s/g, "");

    console.log(`[SIGEP] Etiqueta obtida com sucesso: ${trackingCode}`);

    return {
      trackingCode,
      etiquetaNumber,
      xmlRequest: soapXML,
      xmlResponse: responseText,
      isSimulated: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SIGEP] Erro ao chamar serviço:", errorMessage);
    
    // Fallback para modo simulado em caso de erro
    console.log("[SIGEP] Usando fallback simulado devido a erro");
    const prefix = serviceCode === "04162" ? "NX" : "PM";
    const randomNum = Math.floor(Math.random() * 900000000) + 100000000;
    const trackingCode = `${prefix}${randomNum}BR`;
    const etiquetaNumber = `${prefix} ${String(randomNum).substring(0, 3)} ${String(randomNum).substring(3, 6)} ${String(randomNum).substring(6)} BR`;
    
    return {
      trackingCode,
      etiquetaNumber,
      xmlRequest: soapXML,
      xmlResponse: `ERRO: ${errorMessage}`,
      isSimulated: true,
    };
  }
}
