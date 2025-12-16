import { useState, useEffect } from 'react';
import { Truck, Loader2, MapPin, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useStoreSettings, ShippingMode } from '@/hooks/useStoreSettings';

export interface ShippingOption {
  service: string;
  name: string;
  price: number;
  delivery_days: number;
  delivery_range: string;
}

interface ShippingCalculatorProps {
  onSelectOption?: (option: ShippingOption) => void;
  selectedOption?: ShippingOption | null;
  compact?: boolean;
  peso?: number; // Weight in grams, defaults to 300
  initialCep?: string; // Pre-fill CEP if available
  showPickup?: boolean; // Show pickup option
  itemsTotal?: number; // Total of items for free shipping calculation
}

const ShippingCalculator = ({ 
  onSelectOption, 
  selectedOption: externalSelectedOption, 
  compact = false, 
  peso = 300, 
  initialCep = '',
  showPickup = false,
  itemsTotal = 0
}: ShippingCalculatorProps) => {
  const { settings } = useStoreSettings();
  const [cep, setCep] = useState(initialCep);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [internalSelectedOption, setInternalSelectedOption] = useState<ShippingOption | null>(null);
  
  // Use external state if provided, otherwise use internal state
  const selectedOption = externalSelectedOption !== undefined ? externalSelectedOption : internalSelectedOption;
  
  const handleSelectOption = (option: ShippingOption) => {
    setInternalSelectedOption(option);
    onSelectOption?.(option);
  };

  // Create pickup option
  const pickupOption: ShippingOption = {
    service: 'pickup',
    name: 'Retirar na Loja',
    price: 0,
    delivery_days: 0,
    delivery_range: 'Assim que estiver pronto'
  };

  // Create free shipping option
  const freeShippingOption: ShippingOption = {
    service: 'free',
    name: 'Frete Grátis',
    price: 0,
    delivery_days: settings.delivery_max_days,
    delivery_range: `${settings.delivery_min_days} a ${settings.delivery_max_days} dias úteis`
  };

  // Create fixed shipping option
  const fixedShippingOption: ShippingOption = {
    service: 'fixed',
    name: 'Entrega Padrão',
    price: settings.standard_shipping_rate,
    delivery_days: settings.delivery_max_days,
    delivery_range: `${settings.delivery_min_days} a ${settings.delivery_max_days} dias úteis`
  };

  // Check if eligible for free shipping based on threshold
  const isEligibleForFreeShipping = itemsTotal >= settings.free_shipping_threshold;

  // Auto-load options based on shipping mode
  useEffect(() => {
    if (settings.shipping_mode === 'free') {
      const opts: ShippingOption[] = [freeShippingOption];
      if (showPickup && settings.store_pickup_enabled) {
        opts.push(pickupOption);
      }
      setOptions(opts);
      if (!selectedOption) {
        handleSelectOption(freeShippingOption);
      }
    } else if (settings.shipping_mode === 'fixed') {
      const shippingOpt = isEligibleForFreeShipping ? freeShippingOption : fixedShippingOption;
      const opts: ShippingOption[] = [shippingOpt];
      if (showPickup && settings.store_pickup_enabled) {
        opts.push(pickupOption);
      }
      setOptions(opts);
      if (!selectedOption) {
        handleSelectOption(shippingOpt);
      }
    }
    // For 'correios' mode, options are loaded via calculateShipping
  }, [settings.shipping_mode, settings.store_pickup_enabled, showPickup, isEligibleForFreeShipping]);

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return digits;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCep(formatCep(e.target.value));
    setError(null);
  };

  const calculateShipping = async () => {
    const cepClean = cep.replace(/\D/g, '');
    
    if (cepClean.length !== 8) {
      setError('CEP inválido. Digite 8 números.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('calculate-shipping', {
        body: { cep_destino: cepClean, peso },
      });

      if (fnError) throw fnError;
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao calcular frete');
      }

      let opts = data.options as ShippingOption[];
      
      // If eligible for free shipping, make standard options free
      if (isEligibleForFreeShipping) {
        opts = opts.map(opt => ({
          ...opt,
          price: 0,
          name: opt.name + ' (Grátis)'
        }));
      }

      // Add pickup option if enabled
      if (showPickup && settings.store_pickup_enabled) {
        opts.push(pickupOption);
      }

      setOptions(opts);
      
      // Auto-select first option
      if (opts.length > 0 && !selectedOption) {
        handleSelectOption(opts[0]);
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao calcular frete';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Grátis';
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // If mode is 'free', show simple message
  if (settings.shipping_mode === 'free') {
    return (
      <div className={compact ? "space-y-3" : "space-y-4"}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Truck className="h-4 w-4 text-primary" />
          Entrega
        </div>
        
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium text-primary">🎉 Frete Grátis para todo o Brasil!</p>
          <p className="text-xs text-muted-foreground mt-1">
            Prazo estimado: {settings.delivery_min_days} a {settings.delivery_max_days} dias úteis
          </p>
        </div>

        {showPickup && settings.store_pickup_enabled && (
          <RadioGroup
            value={selectedOption?.service || 'free'}
            onValueChange={(value) => {
              const option = value === 'pickup' ? pickupOption : freeShippingOption;
              handleSelectOption(option);
            }}
            className="space-y-2"
          >
            <div
              onClick={() => handleSelectOption(freeShippingOption)}
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedOption?.service === 'free' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="free" id="free" />
                <label htmlFor="free" className="cursor-pointer">
                  <p className="font-medium text-sm">Entrega em casa</p>
                  <p className="text-xs text-muted-foreground">{freeShippingOption.delivery_range}</p>
                </label>
              </div>
              <span className="font-semibold text-primary">Grátis</span>
            </div>

            <div
              onClick={() => handleSelectOption(pickupOption)}
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedOption?.service === 'pickup' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="pickup" id="pickup" />
                <label htmlFor="pickup" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" />
                    <p className="font-medium text-sm">Retirar na Loja</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{pickupOption.delivery_range}</p>
                  {settings.store_pickup_address && (
                    <p className="text-xs text-muted-foreground mt-1">📍 {settings.store_pickup_address}</p>
                  )}
                </label>
              </div>
              <span className="font-semibold text-primary">Grátis</span>
            </div>
          </RadioGroup>
        )}
      </div>
    );
  }

  // If mode is 'fixed', show simple fixed rate or free shipping based on threshold
  if (settings.shipping_mode === 'fixed') {
    return (
      <div className={compact ? "space-y-3" : "space-y-4"}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Truck className="h-4 w-4 text-primary" />
          Entrega
        </div>
        
        <RadioGroup
          value={selectedOption?.service || (isEligibleForFreeShipping ? 'free' : 'fixed')}
          onValueChange={(value) => {
            if (value === 'pickup') {
              handleSelectOption(pickupOption);
            } else {
              handleSelectOption(isEligibleForFreeShipping ? freeShippingOption : fixedShippingOption);
            }
          }}
          className="space-y-2"
        >
          <div
            onClick={() => handleSelectOption(isEligibleForFreeShipping ? freeShippingOption : fixedShippingOption)}
            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedOption?.service !== 'pickup' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value={isEligibleForFreeShipping ? 'free' : 'fixed'} id="delivery" />
              <label htmlFor="delivery" className="cursor-pointer">
                <p className="font-medium text-sm">Entrega Padrão</p>
                <p className="text-xs text-muted-foreground">
                  {settings.delivery_min_days} a {settings.delivery_max_days} dias úteis
                </p>
              </label>
            </div>
            <span className={`font-semibold ${isEligibleForFreeShipping ? 'text-primary' : ''}`}>
              {isEligibleForFreeShipping ? 'Grátis' : formatPrice(settings.standard_shipping_rate)}
            </span>
          </div>

          {showPickup && settings.store_pickup_enabled && (
            <div
              onClick={() => handleSelectOption(pickupOption)}
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedOption?.service === 'pickup' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="pickup" id="pickup" />
                <label htmlFor="pickup" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" />
                    <p className="font-medium text-sm">Retirar na Loja</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{pickupOption.delivery_range}</p>
                  {settings.store_pickup_address && (
                    <p className="text-xs text-muted-foreground mt-1">📍 {settings.store_pickup_address}</p>
                  )}
                </label>
              </div>
              <span className="font-semibold text-primary">Grátis</span>
            </div>
          )}
        </RadioGroup>

        {!isEligibleForFreeShipping && settings.free_shipping_threshold > 0 && (
          <p className="text-xs text-muted-foreground">
            Faltam {formatPrice(settings.free_shipping_threshold - itemsTotal)} para frete grátis!
          </p>
        )}
      </div>
    );
  }

  // Mode is 'correios' - show CEP input and calculate
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Truck className="h-4 w-4 text-primary" />
        Calcular Frete
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Digite seu CEP"
            value={cep}
            onChange={handleCepChange}
            maxLength={9}
            className={error ? 'border-destructive' : ''}
          />
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
        <Button 
          onClick={calculateShipping} 
          disabled={isLoading || cep.replace(/\D/g, '').length < 8}
          size={compact ? "default" : "default"}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Calcular'}
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

      {options.length > 0 && (
        <RadioGroup
          value={selectedOption?.service || options[0]?.service}
          onValueChange={(value) => {
            const option = options.find(o => o.service === value);
            if (option) handleSelectOption(option);
          }}
          className="space-y-2"
        >
          {options.map((option) => (
            <div
              key={option.service}
              onClick={() => handleSelectOption(option)}
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedOption?.service === option.service 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value={option.service} id={option.service} />
                <label htmlFor={option.service} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    {option.service === 'pickup' && <Store className="h-4 w-4 text-primary" />}
                    <p className="font-medium text-sm">{option.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{option.delivery_range}</p>
                  {option.service === 'pickup' && settings.store_pickup_address && (
                    <p className="text-xs text-muted-foreground mt-1">📍 {settings.store_pickup_address}</p>
                  )}
                </label>
              </div>
              <span className={`font-semibold ${option.price === 0 ? 'text-primary' : ''}`}>
                {formatPrice(option.price)}
              </span>
            </div>
          ))}
        </RadioGroup>
      )}

      {/* Show pickup even without CEP calculation if enabled */}
      {options.length === 0 && showPickup && settings.store_pickup_enabled && (
        <div
          onClick={() => handleSelectOption(pickupOption)}
          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
            selectedOption?.service === 'pickup' 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <Store className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium text-sm">Retirar na Loja</p>
              <p className="text-xs text-muted-foreground">{pickupOption.delivery_range}</p>
              {settings.store_pickup_address && (
                <p className="text-xs text-muted-foreground mt-1">📍 {settings.store_pickup_address}</p>
              )}
            </div>
          </div>
          <span className="font-semibold text-primary">Grátis</span>
        </div>
      )}
    </div>
  );
};

export default ShippingCalculator;
