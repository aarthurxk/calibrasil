import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShippingRequest {
  cep_destino: string;
  peso?: number; // Weight in grams, defaults to 300
}

interface ShippingOption {
  service: string;
  name: string;
  price: number;
  delivery_days: number;
  delivery_range: string;
}

interface CorreiosAuthResponse {
  ambiente: string;
  id: string;
  token: string;
  expiraEm: string;
}

interface CorreiosPrecoItem {
  coProduto: string;
  pcBase: string;
  pcBaseGeral: string;
  pcFinal: string;
  txErro?: {
    cdErro?: string;
    dsErro?: string;
  };
}

interface CorreiosPrazoItem {
  coProduto: string;
  prazoEntrega: number;
  dataMaxima: string;
  txErro?: {
    cdErro?: string;
    dsErro?: string;
  };
}

// Service name mapping
const SERVICE_NAMES: Record<string, { name: string; description: string }> = {
  "03085": { name: "PAC", description: "Encomenda Econômica" },
  "03050": { name: "SEDEX", description: "Entrega Expressa" },
  "04740": { name: "SEDEX 10", description: "Entrega até às 10h" },
  "05691": { name: "SEDEX 12", description: "Entrega até às 12h" },
};

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60000;

const checkRateLimit = (clientIP: string): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(clientIP);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
};

const cleanupRateLimitMap = () => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALCULATE-SHIPPING] ${step}${detailsStr}`);
};

// Token cache
let cachedToken: { token: string; expiraEm: Date } | null = null;

async function getCorreiosToken(): Promise<string> {
  // Check if cached token is still valid (with 5 min buffer)
  if (cachedToken && new Date(cachedToken.expiraEm.getTime() - 5 * 60 * 1000) > new Date()) {
    logStep("Using cached Correios token");
    return cachedToken.token;
  }

  const usuario = Deno.env.get("CORREIOS_USUARIO");
  const senha = Deno.env.get("CORREIOS_SENHA_API");
  const cartaoPostagem = Deno.env.get("CORREIOS_CARTAO_POSTAGEM");

  if (!usuario || !senha || !cartaoPostagem) {
    throw new Error("Credenciais dos Correios não configuradas");
  }

  logStep("Authenticating with Correios API");

  const authString = btoa(`${usuario}:${senha}`);
  
  const response = await fetch(
    "https://api.correios.com.br/token/v1/autentica/cartaopostagem",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`,
      },
      body: JSON.stringify({ numero: cartaoPostagem }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logStep("Correios auth failed", { status: response.status, error: errorText });
    throw new Error(`Erro na autenticação dos Correios: ${response.status}`);
  }

  const authData: CorreiosAuthResponse = await response.json();
  
  // Cache the token
  cachedToken = {
    token: authData.token,
    expiraEm: new Date(authData.expiraEm),
  };

  logStep("Correios auth successful", { expiraEm: authData.expiraEm });
  return authData.token;
}

async function fetchCorreiosPreco(
  token: string,
  cepOrigem: string,
  cepDestino: string,
  peso: number,
  servicos: string[]
): Promise<CorreiosPrecoItem[]> {
  logStep("Fetching Correios prices", { cepDestino, peso, servicos });

  const response = await fetch(
    "https://api.correios.com.br/preco/v1/nacional",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        cepOrigem,
        cepDestino,
        psObjeto: peso, // Weight in grams
        tpObjeto: "2", // Pacote/Caixa
        comprimento: 20,
        altura: 5,
        largura: 15,
        diametro: 0,
        cdServico: servicos,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logStep("Correios price API failed", { status: response.status, error: errorText });
    throw new Error(`Erro na consulta de preço: ${response.status}`);
  }

  const data = await response.json();
  logStep("Correios price response", { count: data?.length });
  return data;
}

async function fetchCorreiosPrazo(
  token: string,
  cepOrigem: string,
  cepDestino: string,
  servicos: string[]
): Promise<CorreiosPrazoItem[]> {
  logStep("Fetching Correios deadlines", { cepDestino, servicos });

  const response = await fetch(
    "https://api.correios.com.br/prazo/v1/nacional",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        cepOrigem,
        cepDestino,
        cdServico: servicos,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logStep("Correios deadline API failed", { status: response.status, error: errorText });
    throw new Error(`Erro na consulta de prazo: ${response.status}`);
  }

  const data = await response.json();
  logStep("Correios deadline response", { count: data?.length });
  return data;
}

async function calculateShippingWithCorreios(
  cepDestino: string,
  peso: number
): Promise<ShippingOption[]> {
  const cepOrigem = Deno.env.get("CORREIOS_CEP_ORIGEM") || "51110160";
  const servicosConfig = Deno.env.get("CORREIOS_SERVICOS") || "03085,03050";
  const servicos = servicosConfig.split(",").map(s => s.trim());

  const token = await getCorreiosToken();
  
  // Fetch prices and deadlines in parallel
  const [precos, prazos] = await Promise.all([
    fetchCorreiosPreco(token, cepOrigem, cepDestino, peso, servicos),
    fetchCorreiosPrazo(token, cepOrigem, cepDestino, servicos),
  ]);

  // Create a map of deadlines by service code
  const prazoMap = new Map<string, number>();
  for (const prazo of prazos) {
    if (!prazo.txErro?.cdErro) {
      prazoMap.set(prazo.coProduto, prazo.prazoEntrega);
    }
  }

  // Build shipping options
  const options: ShippingOption[] = [];
  
  for (const preco of precos) {
    if (preco.txErro?.cdErro) {
      logStep("Service unavailable", { service: preco.coProduto, error: preco.txErro.dsErro });
      continue;
    }

    const serviceInfo = SERVICE_NAMES[preco.coProduto];
    if (!serviceInfo) continue;

    const price = parseFloat(preco.pcFinal.replace(",", "."));
    const deliveryDays = prazoMap.get(preco.coProduto) || 10;

    options.push({
      service: preco.coProduto,
      name: `${serviceInfo.name} - ${serviceInfo.description}`,
      price,
      delivery_days: deliveryDays,
      delivery_range: `${deliveryDays} dias úteis`,
    });
  }

  // Sort by price (cheapest first)
  options.sort((a, b) => a.price - b.price);

  return options;
}

// Fallback calculation when Correios API fails
function calculateShippingFallback(cepDestino: string, peso: number): ShippingOption[] {
  logStep("Using fallback shipping calculation");
  
  const region = getRegionFromCep(cepDestino);
  
  const regionPrices: Record<string, { pac: number; sedex: number; pacDays: number; sedexDays: number }> = {
    'nordeste': { pac: 18.90, sedex: 32.90, pacDays: 7, sedexDays: 3 },
    'sudeste': { pac: 24.90, sedex: 42.90, pacDays: 10, sedexDays: 4 },
    'sul': { pac: 28.90, sedex: 48.90, pacDays: 12, sedexDays: 5 },
    'norte': { pac: 32.90, sedex: 54.90, pacDays: 15, sedexDays: 7 },
    'centro-oeste': { pac: 26.90, sedex: 45.90, pacDays: 10, sedexDays: 4 },
  };

  const pricing = regionPrices[region] || regionPrices['sudeste'];
  
  // Adjust price by weight (add R$5 per 500g above 300g)
  const weightMultiplier = Math.max(0, Math.ceil((peso - 300) / 500));
  const weightExtra = weightMultiplier * 5;

  return [
    {
      service: '03085',
      name: 'PAC - Encomenda Econômica',
      price: pricing.pac + weightExtra,
      delivery_days: pricing.pacDays,
      delivery_range: `${pricing.pacDays} dias úteis`,
    },
    {
      service: '03050',
      name: 'SEDEX - Entrega Expressa',
      price: pricing.sedex + weightExtra,
      delivery_days: pricing.sedexDays,
      delivery_range: `${pricing.sedexDays} dias úteis`,
    },
  ];
}

function getRegionFromCep(cep: string): string {
  const prefix = parseInt(cep.substring(0, 1));
  
  switch (prefix) {
    case 0:
    case 1:
    case 2:
    case 3:
      return 'sudeste';
    case 4:
    case 5:
      return 'nordeste';
    case 6:
      const secondDigit = parseInt(cep.substring(1, 2));
      if (secondDigit <= 3) return 'nordeste';
      return 'norte';
    case 7:
      return 'centro-oeste';
    case 8:
    case 9:
      return 'sul';
    default:
      return 'sudeste';
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || 
                   "unknown";
  
  if (!checkRateLimit(clientIP)) {
    logStep("Rate limit exceeded", { clientIP });
    return new Response(
      JSON.stringify({ success: false, error: "Muitas requisições. Tente novamente em 1 minuto." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
    );
  }

  if (Math.random() < 0.1) cleanupRateLimitMap();

  try {
    logStep("Function started");

    const body: ShippingRequest = await req.json();
    const { cep_destino, peso = 300 } = body;

    if (!cep_destino) {
      throw new Error("CEP de destino é obrigatório");
    }

    const cepClean = cep_destino.replace(/\D/g, "");
    
    if (cepClean.length !== 8) {
      throw new Error("CEP inválido. Deve conter 8 dígitos.");
    }

    logStep("Calculating shipping", { cep_destino: cepClean, peso });

    let shippingOptions: ShippingOption[];
    
    try {
      shippingOptions = await calculateShippingWithCorreios(cepClean, peso);
      
      if (shippingOptions.length === 0) {
        throw new Error("Nenhuma opção de frete disponível");
      }
    } catch (correiosError) {
      logStep("Correios API error, using fallback", { 
        error: correiosError instanceof Error ? correiosError.message : String(correiosError) 
      });
      shippingOptions = calculateShippingFallback(cepClean, peso);
    }

    logStep("Shipping calculated", { options: shippingOptions.length });

    return new Response(JSON.stringify({ 
      success: true, 
      options: shippingOptions 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
