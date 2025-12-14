import { useState } from 'react';
import { Truck, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

const ShippingCalculator = ({ onSelectOption, selectedOption: externalSelectedOption, compact = false, peso = 300, initialCep = '' }: ShippingCalculatorProps) => {
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

      setOptions(data.options);
      
      // Auto-select first option
      if (data.options.length > 0) {
        handleSelectOption(data.options[0]);
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
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

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
                  <p className="font-medium text-sm">{option.name}</p>
                  <p className="text-xs text-muted-foreground">{option.delivery_range}</p>
                </label>
              </div>
              <span className="font-semibold text-primary">{formatPrice(option.price)}</span>
            </div>
          ))}
        </RadioGroup>
      )}
    </div>
  );
};

export default ShippingCalculator;
