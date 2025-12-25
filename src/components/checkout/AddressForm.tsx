import { useState } from "react";
import { AlertCircle, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAddress } from "@/hooks/useUserAddresses";

interface FieldErrors {
  zip?: string;
  street?: string;
  houseNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

interface AddressFormProps {
  zip: string;
  street: string;
  houseNumber: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  fieldErrors: FieldErrors;
  isLoadingCep: boolean;
  addresses: UserAddress[];
  selectedAddressId: string | null;
  useNewAddress: boolean;
  saveNewAddress: boolean;
  addressLabel: string;
  canAddMore: boolean;
  user: { id: string } | null;
  onZipChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStreetChange: (value: string) => void;
  onHouseNumberChange: (value: string) => void;
  onComplementChange: (value: string) => void;
  onNeighborhoodChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onFieldBlur: (field: keyof FieldErrors, value: string) => void;
  onSelectAddress: (address: UserAddress) => void;
  onUseNewAddress: () => void;
  onSaveNewAddressChange: (checked: boolean) => void;
  onAddressLabelChange: (value: string) => void;
}

const AddressForm = ({
  zip,
  street,
  houseNumber,
  complement,
  neighborhood,
  city,
  state,
  fieldErrors,
  isLoadingCep,
  addresses,
  selectedAddressId,
  useNewAddress,
  saveNewAddress,
  addressLabel,
  canAddMore,
  user,
  onZipChange,
  onStreetChange,
  onHouseNumberChange,
  onComplementChange,
  onNeighborhoodChange,
  onCityChange,
  onStateChange,
  onFieldBlur,
  onSelectAddress,
  onUseNewAddress,
  onSaveNewAddressChange,
  onAddressLabelChange,
}: AddressFormProps) => {
  const hasAddresses = user && addresses.length > 0;
  const showNewAddressForm = !hasAddresses || useNewAddress;
  const hasFilledCep = zip.replace(/\D/g, "").length === 8 && !fieldErrors.zip;

  return (
    <section data-testid="address-section" className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <h2 className="text-lg font-semibold">Endereço de Entrega</h2>

      {/* Prompt for users without addresses */}
      {user && addresses.length === 0 && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
          <p className="text-sm text-foreground">
            Você ainda não tem endereços salvos. Preencha o endereço abaixo e salve para usar em
            compras futuras!
          </p>
        </div>
      )}

      {/* Saved Addresses */}
      {hasAddresses && (
        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">Endereços salvos</Label>
          <div className="space-y-2">
            {addresses.map((addr) => (
              <button
                key={addr.id}
                type="button"
                onClick={() => onSelectAddress(addr)}
                className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  selectedAddressId === addr.id && !useNewAddress
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{addr.label}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {addr.street}, {addr.house_number}
                      {addr.complement && ` - ${addr.complement}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {addr.neighborhood}, {addr.city} - {addr.state}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onUseNewAddress}
            className={`w-full p-4 border-2 rounded-xl text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              useNewAddress
                ? "border-primary bg-primary/5"
                : "border-dashed border-border hover:border-primary/50"
            }`}
          >
            <span className="text-sm font-medium">+ Usar outro endereço</span>
          </button>
        </div>
      )}

      {/* New Address Form */}
      {showNewAddressForm && (
        <div className="space-y-4">
          {/* CEP */}
          <div className="space-y-1.5">
            <Label htmlFor="zip" className="text-sm font-medium">
              CEP <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="zip"
                data-testid="cep-input"
                required
                placeholder="00000-000"
                inputMode="numeric"
                value={zip}
                onChange={onZipChange}
                onBlur={() => onFieldBlur("zip", zip)}
                maxLength={9}
                className={`h-11 ${fieldErrors.zip ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {isLoadingCep && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {fieldErrors.zip && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {fieldErrors.zip}
              </p>
            )}
          </div>

          {/* Address fields - only show after valid CEP */}
          {hasFilledCep && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-xs text-muted-foreground">
                ✓ Preenchido automaticamente pelo CEP
              </p>

              {/* Street */}
              <div className="space-y-1.5">
                <Label htmlFor="street" className="text-sm font-medium">
                  Rua <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="street"
                  required
                  value={street}
                  onChange={(e) => onStreetChange(e.target.value)}
                  onBlur={() => onFieldBlur("street", street)}
                  className={`h-11 ${fieldErrors.street ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {fieldErrors.street && (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {fieldErrors.street}
                  </p>
                )}
              </div>

              {/* Number & Complement */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="houseNumber" className="text-sm font-medium">
                    Número <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="houseNumber"
                    required
                    value={houseNumber}
                    onChange={(e) => onHouseNumberChange(e.target.value)}
                    onBlur={() => onFieldBlur("houseNumber", houseNumber)}
                    className={`h-11 ${fieldErrors.houseNumber ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {fieldErrors.houseNumber && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      {fieldErrors.houseNumber}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="complement" className="text-sm font-medium">
                    Complemento
                  </Label>
                  <Input
                    id="complement"
                    placeholder="Apto, Bloco, etc."
                    value={complement}
                    onChange={(e) => onComplementChange(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              {/* Neighborhood */}
              <div className="space-y-1.5">
                <Label htmlFor="neighborhood" className="text-sm font-medium">
                  Bairro <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="neighborhood"
                  required
                  value={neighborhood}
                  onChange={(e) => onNeighborhoodChange(e.target.value)}
                  onBlur={() => onFieldBlur("neighborhood", neighborhood)}
                  className={`h-11 ${fieldErrors.neighborhood ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {fieldErrors.neighborhood && (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {fieldErrors.neighborhood}
                  </p>
                )}
              </div>

              {/* City & State */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="city" className="text-sm font-medium">
                    Cidade <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="city"
                    required
                    value={city}
                    onChange={(e) => onCityChange(e.target.value)}
                    onBlur={() => onFieldBlur("city", city)}
                    className={`h-11 ${fieldErrors.city ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {fieldErrors.city && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      {fieldErrors.city}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-sm font-medium">
                    Estado <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="state"
                    required
                    placeholder="UF"
                    value={state}
                    onChange={(e) => onStateChange(e.target.value.toUpperCase())}
                    onBlur={() => onFieldBlur("state", state)}
                    maxLength={2}
                    className={`h-11 ${fieldErrors.state ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {fieldErrors.state && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      {fieldErrors.state}
                    </p>
                  )}
                </div>
              </div>

              {/* Save address option */}
              {user && canAddMore && (useNewAddress || addresses.length === 0) && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="saveAddress"
                      checked={saveNewAddress}
                      onCheckedChange={(checked) => onSaveNewAddressChange(checked === true)}
                    />
                    <Label htmlFor="saveAddress" className="text-sm font-normal cursor-pointer">
                      Salvar este endereço no meu perfil
                    </Label>
                  </div>
                  {saveNewAddress && (
                    <div className="space-y-1.5">
                      <Label htmlFor="addressLabel" className="text-sm font-medium">
                        Nome do endereço <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="addressLabel"
                        required={saveNewAddress}
                        placeholder="Ex: Casa, Trabalho"
                        value={addressLabel}
                        onChange={(e) => onAddressLabelChange(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AddressForm;
