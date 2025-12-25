import { useState, useEffect } from "react";
import { Store, Truck, Loader2, MapPin, Check, Zap, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export interface ShippingOption {
  service: string;
  name: string;
  price: number;
  delivery_days: number;
  delivery_range: string;
}

interface DeliveryMethodCardsProps {
  selectedOption: ShippingOption | null;
  onSelectOption: (option: ShippingOption) => void;
  itemsTotal: number;
  initialCep?: string;
  onCepChange?: (cep: string) => void;
  onCepValid?: (isValid: boolean) => void;
}

const DeliveryMethodCards = ({
  selectedOption,
  onSelectOption,
  itemsTotal,
  initialCep = "",
  onCepChange,
  onCepValid,
}: DeliveryMethodCardsProps) => {
  const { settings } = useStoreSettings();
  const [cep, setCep] = useState(initialCep);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedOptions, setCalculatedOptions] = useState<ShippingOption[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);

  // Static options
  const pickupOption: ShippingOption = {
    service: "pickup",
    name: "Retirar na Loja",
    price: 0,
    delivery_days: 0,
    delivery_range: "Assim que estiver pronto",
  };

  const freeShippingOption: ShippingOption = {
    service: "free",
    name: "Frete Grátis",
    price: 0,
    delivery_days: settings.delivery_max_days,
    delivery_range: `${settings.delivery_min_days} a ${settings.delivery_max_days} dias úteis`,
  };

  const fixedShippingOption: ShippingOption = {
    service: "fixed",
    name: "Entrega Padrão",
    price: settings.standard_shipping_rate,
    delivery_days: settings.delivery_max_days,
    delivery_range: `${settings.delivery_min_days} a ${settings.delivery_max_days} dias úteis`,
  };

  // Placeholder options for PAC/SEDEX before calculation
  const pacPlaceholder: ShippingOption = {
    service: "pac",
    name: "PAC",
    price: 0,
    delivery_days: 0,
    delivery_range: "Informe o CEP para calcular",
  };

  const sedexPlaceholder: ShippingOption = {
    service: "sedex",
    name: "SEDEX",
    price: 0,
    delivery_days: 0,
    delivery_range: "Informe o CEP para calcular",
  };

  const isEligibleForFreeShipping = itemsTotal >= settings.free_shipping_threshold;
  const isPickupSelected = selectedOption?.service === "pickup";
  const isCorreiosMode = settings.shipping_mode === "correios";

  // Get PAC option (calculated or placeholder)
  const getPacOption = () => {
    if (hasCalculated) {
      return calculatedOptions.find(opt => opt.service.toLowerCase().includes("pac") || opt.name.toLowerCase().includes("pac"));
    }
    return null;
  };

  // Get SEDEX option (calculated or placeholder)  
  const getSedexOption = () => {
    if (hasCalculated) {
      return calculatedOptions.find(opt => opt.service.toLowerCase().includes("sedex") || opt.name.toLowerCase().includes("sedex"));
    }
    return null;
  };

  const pacOption = getPacOption();
  const sedexOption = getSedexOption();

  // Auto-select pickup by default if available
  useEffect(() => {
    if (settings.store_pickup_enabled && !selectedOption) {
      onSelectOption(pickupOption);
    } else if (!settings.store_pickup_enabled && !selectedOption) {
      if (settings.shipping_mode === "free") {
        onSelectOption(freeShippingOption);
      } else if (settings.shipping_mode === "fixed") {
        onSelectOption(isEligibleForFreeShipping ? freeShippingOption : fixedShippingOption);
      }
    }
  }, [settings.store_pickup_enabled, settings.shipping_mode]);

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return digits;
  };

  const handleCepInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    onCepChange?.(formatted);
    setError(null);
  };

  const handleCepBlur = () => {
    const cepClean = cep.replace(/\D/g, "");
    if (cepClean.length > 0 && cepClean.length < 8) {
      setError("Digite um CEP válido para calcular o frete. Ex: 51020-250");
      onCepValid?.(false);
    }
  };

  const calculateShipping = async () => {
    const cepClean = cep.replace(/\D/g, "");
    if (cepClean.length !== 8) {
      setError("Digite um CEP válido para calcular o frete. Ex: 51020-250");
      onCepValid?.(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("calculate-shipping", {
        body: { cep_destino: cepClean, peso: 300 },
      });

      if (fnError) throw fnError;

      if (!data.success) {
        throw new Error(data.error || "Não foi possível calcular o frete para este CEP");
      }

      let opts = data.options as ShippingOption[];

      if (isEligibleForFreeShipping) {
        opts = opts.map((opt) => ({
          ...opt,
          price: 0,
          name: opt.name + " (Grátis)",
        }));
      }

      setCalculatedOptions(opts);
      setHasCalculated(true);
      onCepValid?.(true);

      // Auto-select PAC if currently not pickup
      if (!isPickupSelected && opts.length > 0) {
        const pac = opts.find(o => o.service.toLowerCase().includes("pac") || o.name.toLowerCase().includes("pac"));
        if (pac) onSelectOption(pac);
        else onSelectOption(opts[0]);
      }
    } catch (err: unknown) {
      const errorMessage = "Não foi possível calcular o frete. Verifique o CEP e tente novamente.";
      setError(errorMessage);
      onCepValid?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Grátis";
    return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleSelectPickup = () => {
    onSelectOption(pickupOption);
    setError(null);
    onCepValid?.(true);
  };

  const handleSelectPac = () => {
    if (pacOption) {
      onSelectOption(pacOption);
    }
  };

  const handleSelectSedex = () => {
    if (sedexOption) {
      onSelectOption(sedexOption);
    }
  };

  const handleSelectDelivery = (option: ShippingOption) => {
    onSelectOption(option);
  };

  const isPacSelected = selectedOption?.service?.toLowerCase().includes("pac") || selectedOption?.name?.toLowerCase().includes("pac");
  const isSedexSelected = selectedOption?.service?.toLowerCase().includes("sedex") || selectedOption?.name?.toLowerCase().includes("sedex");

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Entrega</h2>

      <div className="space-y-3">
        {/* Pickup Card - Always visible if enabled */}
        {settings.store_pickup_enabled && (
          <button
            type="button"
            data-testid="delivery-card-pickup"
            onClick={handleSelectPickup}
            className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              isPickupSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isPickupSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">Retirar na Loja</span>
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                      Recomendado
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {pickupOption.delivery_range}
                  </p>
                  {settings.store_pickup_address && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {settings.store_pickup_address}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">Grátis</span>
                {isPickupSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            </div>
          </button>
        )}

        {/* PAC Card - Always visible in correios mode */}
        {isCorreiosMode && (
          <button
            type="button"
            data-testid="delivery-card-pac"
            onClick={handleSelectPac}
            disabled={!hasCalculated}
            className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              isPacSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : !hasCalculated
                ? "border-border opacity-60 cursor-not-allowed"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isPacSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-semibold">{pacOption?.name || "PAC"}</span>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {pacOption?.delivery_range || "Informe o CEP para calcular"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasCalculated && pacOption ? (
                  <>
                    <span className={`font-bold ${pacOption.price === 0 ? "text-primary" : ""}`}>
                      {formatPrice(pacOption.price)}
                    </span>
                    {isPacSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </button>
        )}

        {/* SEDEX Card - Always visible in correios mode */}
        {isCorreiosMode && (
          <button
            type="button"
            data-testid="delivery-card-sedex"
            onClick={handleSelectSedex}
            disabled={!hasCalculated}
            className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              isSedexSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : !hasCalculated
                ? "border-border opacity-60 cursor-not-allowed"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isSedexSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-semibold">{sedexOption?.name || "SEDEX"}</span>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {sedexOption?.delivery_range || "Informe o CEP para calcular"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasCalculated && sedexOption ? (
                  <>
                    <span className={`font-bold ${sedexOption.price === 0 ? "text-primary" : ""}`}>
                      {formatPrice(sedexOption.price)}
                    </span>
                    {isSedexSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </button>
        )}

        {/* Free shipping mode - single delivery option */}
        {settings.shipping_mode === "free" && (
          <button
            type="button"
            data-testid="delivery-card-pac"
            onClick={() => handleSelectDelivery(freeShippingOption)}
            className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              selectedOption?.service === "free"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedOption?.service === "free" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-semibold">Entrega em casa</span>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {freeShippingOption.delivery_range}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">Grátis</span>
                {selectedOption?.service === "free" && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            </div>
          </button>
        )}

        {/* Fixed shipping mode - single delivery option */}
        {settings.shipping_mode === "fixed" && (
          <button
            type="button"
            data-testid="delivery-card-pac"
            onClick={() =>
              handleSelectDelivery(isEligibleForFreeShipping ? freeShippingOption : fixedShippingOption)
            }
            className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              selectedOption?.service === "fixed" || selectedOption?.service === "free"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedOption?.service === "fixed" || selectedOption?.service === "free"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-semibold">Entrega Padrão</span>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {fixedShippingOption.delivery_range}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${isEligibleForFreeShipping ? "text-primary" : ""}`}>
                  {isEligibleForFreeShipping ? "Grátis" : formatPrice(settings.standard_shipping_rate)}
                </span>
                {(selectedOption?.service === "fixed" || selectedOption?.service === "free") && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            </div>
          </button>
        )}

        {/* CEP input block - Always show in correios mode so user can calculate shipping */}
        {isCorreiosMode && (
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Calcular frete</p>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5">
                <Input
                  data-testid="cep-input"
                  placeholder="00000-000"
                  value={cep}
                  onChange={handleCepInputChange}
                  onBlur={handleCepBlur}
                  inputMode="numeric"
                  maxLength={9}
                  className={`h-11 bg-background ${error ? "border-destructive" : ""}`}
                />
                {error && (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {error}
                  </p>
                )}
              </div>
              <Button
                type="button"
                data-testid="cep-calc-btn"
                onClick={calculateShipping}
                disabled={isLoading || cep.replace(/\D/g, "").length < 8}
                className="h-11 px-6"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
              </Button>
            </div>
            <a
              href="https://buscacepinter.correios.com.br/app/endereco/index.php"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <MapPin className="h-3 w-3" />
              Não sei meu CEP
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

export default DeliveryMethodCards;
