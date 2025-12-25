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
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);

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

  const isEligibleForFreeShipping = itemsTotal >= settings.free_shipping_threshold;
  const isPickupSelected = selectedOption?.service === "pickup";
  const isCorreiosMode = settings.shipping_mode === "correios";

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

      setShippingOptions(opts);
      setHasCalculated(true);
      onCepValid?.(true);

      // Auto-select first shipping option
      if (opts.length > 0) {
        onSelectOption(opts[0]);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? "Não foi possível calcular o frete. Verifique o CEP e tente novamente."
          : "Erro ao calcular frete. Tente novamente.";
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

  const handleSelectDelivery = (option: ShippingOption) => {
    onSelectOption(option);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Entrega</h2>

      <div className="space-y-3">
        {/* Pickup Card */}
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

        {/* Delivery options based on shipping mode */}
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

        {/* Correios mode - CEP calculation needed */}
        {isCorreiosMode && !isPickupSelected && (
          <div className="space-y-3">
            {/* PAC Card placeholder when no options calculated */}
            {!hasCalculated && (
              <>
                <button
                  type="button"
                  data-testid="delivery-card-pac"
                  disabled
                  className="w-full p-4 border-2 rounded-xl text-left border-border opacity-60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-muted">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-semibold">PAC</span>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Calcule o frete para ver o prazo
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">—</span>
                  </div>
                </button>
                <button
                  type="button"
                  data-testid="delivery-card-sedex"
                  disabled
                  className="w-full p-4 border-2 rounded-xl text-left border-border opacity-60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-muted">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-semibold">SEDEX</span>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Calcule o frete para ver o prazo
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">—</span>
                  </div>
                </button>
              </>
            )}

            {/* Calculated shipping options */}
            {hasCalculated &&
              shippingOptions.map((option) => (
                <button
                  key={option.service}
                  type="button"
                  data-testid={
                    option.service.toLowerCase().includes("pac")
                      ? "delivery-card-pac"
                      : option.service.toLowerCase().includes("sedex")
                      ? "delivery-card-sedex"
                      : `delivery-card-${option.service}`
                  }
                  onClick={() => handleSelectDelivery(option)}
                  className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    selectedOption?.service === option.service
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          selectedOption?.service === option.service
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {option.service.toLowerCase().includes("sedex") ? (
                          <Zap className="h-5 w-5" />
                        ) : (
                          <Truck className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <span className="font-semibold">{option.name}</span>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {option.delivery_range}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${option.price === 0 ? "text-primary" : ""}`}>
                        {formatPrice(option.price)}
                      </span>
                      {selectedOption?.service === option.service && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}

            {/* CEP input for correios mode when not pickup */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
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
          </div>
        )}
      </div>
    </section>
  );
};

export default DeliveryMethodCards;
