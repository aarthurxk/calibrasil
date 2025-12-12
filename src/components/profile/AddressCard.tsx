import { MapPin, Pencil, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAddress } from "@/hooks/useUserAddresses";

interface AddressCardProps {
  address: UserAddress;
  onEdit: (address: UserAddress) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export const AddressCard = ({ address, onEdit, onDelete, onSetDefault }: AddressCardProps) => {
  return (
    <div className="p-4 border border-border rounded-lg space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-medium">{address.label}</span>
          {address.is_default && (
            <Badge variant="secondary" className="text-xs">
              Padrão
            </Badge>
          )}
        </div>
      </div>

      <div className="text-sm text-muted-foreground space-y-0.5">
        <p>{address.street}, {address.house_number}</p>
        {address.complement && <p>{address.complement}</p>}
        <p>{address.neighborhood}</p>
        <p>{address.city} - {address.state}</p>
        <p>{address.zip}</p>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(address)}>
          <Pencil className="h-3 w-3 mr-1" />
          Editar
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDelete(address.id)}>
          <Trash2 className="h-3 w-3 mr-1" />
          Excluir
        </Button>
        {!address.is_default && (
          <Button variant="ghost" size="sm" onClick={() => onSetDefault(address.id)}>
            <Star className="h-3 w-3 mr-1" />
            Definir como Padrão
          </Button>
        )}
      </div>
    </div>
  );
};
