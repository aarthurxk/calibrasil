import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserAddress, AddressInput } from "@/hooks/useUserAddresses";

interface AddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: UserAddress | null;
  onSave: (address: AddressInput) => Promise<boolean>;
  isFirstAddress?: boolean;
}

export const AddressFormDialog = ({
  open,
  onOpenChange,
  address,
  onSave,
  isFirstAddress = false,
}: AddressFormDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [formData, setFormData] = useState<AddressInput>({
    label: "",
    zip: "",
    street: "",
    house_number: "",
    complement: null,
    neighborhood: "",
    city: "",
    state: "",
    is_default: isFirstAddress,
  });

  useEffect(() => {
    if (address) {
      setFormData({
        label: address.label,
        zip: address.zip,
        street: address.street,
        house_number: address.house_number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        is_default: address.is_default,
      });
    } else {
      setFormData({
        label: "",
        zip: "",
        street: "",
        house_number: "",
        complement: null,
        neighborhood: "",
        city: "",
        state: "",
        is_default: isFirstAddress,
      });
    }
  }, [address, isFirstAddress, open]);

  const fetchAddressByCep = async (cep: string) => {
    const cepNumbers = cep.replace(/\D/g, "");
    if (cepNumbers.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepNumbers}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      }));
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, "");
    const formatado = valor.replace(/(\d{5})(\d{3})/, "$1-$2");
    setFormData((prev) => ({ ...prev, zip: formatado }));

    if (valor.length === 8) {
      fetchAddressByCep(valor);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.label || !formData.zip || !formData.street || !formData.house_number || !formData.neighborhood || !formData.city || !formData.state) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsLoading(true);
    const success = await onSave(formData);
    setIsLoading(false);

    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{address ? "Editar Endereço" : "Novo Endereço"}</DialogTitle>
          <DialogDescription>
            {address ? "Atualize os dados do endereço" : "Adicione um novo endereço de entrega"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="label">Nome do Endereço *</Label>
            <Input
              id="label"
              placeholder="Ex: Casa, Trabalho"
              value={formData.label}
              onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="zip">CEP *</Label>
            <div className="relative">
              <Input
                id="zip"
                placeholder="00000-000"
                value={formData.zip}
                onChange={handleCepChange}
                maxLength={9}
              />
              {isLoadingCep && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="street">Rua *</Label>
            <Input
              id="street"
              placeholder="Preenchido pelo CEP"
              value={formData.street}
              onChange={(e) => setFormData((prev) => ({ ...prev, street: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="house_number">Número *</Label>
              <Input
                id="house_number"
                placeholder="123"
                value={formData.house_number}
                onChange={(e) => setFormData((prev) => ({ ...prev, house_number: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                placeholder="Apto, bloco (opcional)"
                value={formData.complement || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, complement: e.target.value || null }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="neighborhood">Bairro *</Label>
            <Input
              id="neighborhood"
              placeholder="Preenchido pelo CEP"
              value={formData.neighborhood}
              onChange={(e) => setFormData((prev) => ({ ...prev, neighborhood: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                placeholder="Preenchido pelo CEP"
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="state">Estado *</Label>
              <Input
                id="state"
                placeholder="UF"
                value={formData.state}
                onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))}
                maxLength={2}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_default: checked === true }))
              }
              disabled={isFirstAddress}
            />
            <Label htmlFor="is_default" className="text-sm font-normal cursor-pointer">
              Definir como endereço padrão
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {address ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
