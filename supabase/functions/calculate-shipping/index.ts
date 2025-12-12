import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShippingRequest {
  cep_destino: string;
  peso?: number; // Weight in kg, defaults to 0.5
}

interface ShippingOption {
  service: string;
  name: string;
  price: number;
  delivery_days: number;
  delivery_range: string;
}

// CEP origin (store location - adjust as needed)
const CEP_ORIGEM = "60160230"; // Fortaleza-CE

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALCULATE-SHIPPING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const body: ShippingRequest = await req.json();
    const { cep_destino, peso = 0.5 } = body;

    if (!cep_destino) {
      throw new Error("CEP de destino é obrigatório");
    }

    // Clean CEP (remove non-digits)
    const cepClean = cep_destino.replace(/\D/g, "");
    
    if (cepClean.length !== 8) {
      throw new Error("CEP inválido. Deve conter 8 dígitos.");
    }

    logStep("Calculating shipping", { cep_destino: cepClean, peso });

    // Try Correios API (MelhorEnvio or direct Correios)
    // Using a simplified calculation based on distance/region
    const shippingOptions = await calculateShipping(cepClean, peso);

    logStep("Shipping calculated", { options: shippingOptions });

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

async function calculateShipping(cepDestino: string, peso: number): Promise<ShippingOption[]> {
  // Get region from CEP prefix
  const region = getRegionFromCep(cepDestino);
  
  // Base prices by region (simplified calculation)
  const regionPrices: Record<string, { pac: number; sedex: number; pacDays: [number, number]; sedexDays: [number, number] }> = {
    'nordeste': { pac: 18.90, sedex: 32.90, pacDays: [5, 8], sedexDays: [2, 4] },
    'sudeste': { pac: 24.90, sedex: 42.90, pacDays: [7, 12], sedexDays: [3, 5] },
    'sul': { pac: 28.90, sedex: 48.90, pacDays: [8, 14], sedexDays: [4, 6] },
    'norte': { pac: 32.90, sedex: 54.90, pacDays: [10, 18], sedexDays: [5, 8] },
    'centro-oeste': { pac: 26.90, sedex: 45.90, pacDays: [7, 12], sedexDays: [3, 6] },
  };

  const pricing = regionPrices[region] || regionPrices['sudeste'];
  
  // Adjust price by weight (add R$5 per 0.5kg above 0.5kg)
  const weightMultiplier = Math.max(0, Math.ceil((peso - 0.5) / 0.5));
  const weightExtra = weightMultiplier * 5;

  const options: ShippingOption[] = [
    {
      service: 'PAC',
      name: 'PAC - Encomenda Econômica',
      price: pricing.pac + weightExtra,
      delivery_days: pricing.pacDays[1],
      delivery_range: `${pricing.pacDays[0]} a ${pricing.pacDays[1]} dias úteis`,
    },
    {
      service: 'SEDEX',
      name: 'SEDEX - Entrega Expressa',
      price: pricing.sedex + weightExtra,
      delivery_days: pricing.sedexDays[1],
      delivery_range: `${pricing.sedexDays[0]} a ${pricing.sedexDays[1]} dias úteis`,
    },
  ];

  return options;
}

function getRegionFromCep(cep: string): string {
  const prefix = parseInt(cep.substring(0, 1));
  
  // Brazilian CEP regions
  // 0-1: São Paulo (Sudeste)
  // 2: Rio de Janeiro, Espírito Santo (Sudeste)
  // 3: Minas Gerais (Sudeste)
  // 4: Bahia, Sergipe (Nordeste)
  // 5: Pernambuco, Alagoas, Paraíba, Rio Grande do Norte (Nordeste)
  // 6: Ceará, Piauí, Maranhão, Pará, Amazonas, Acre, Amapá, Roraima (Norte/Nordeste)
  // 7: Distrito Federal, Goiás, Tocantins, Mato Grosso, Mato Grosso do Sul, Rondônia (Centro-Oeste)
  // 8: Paraná, Santa Catarina (Sul)
  // 9: Rio Grande do Sul (Sul)

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
      // Check second digit for Ceará (60-63) vs Norte
      const secondDigit = parseInt(cep.substring(1, 2));
      if (secondDigit <= 3) return 'nordeste'; // Ceará, Piauí, Maranhão
      return 'norte'; // Pará, Amazonas, etc.
    case 7:
      return 'centro-oeste';
    case 8:
    case 9:
      return 'sul';
    default:
      return 'sudeste';
  }
}
