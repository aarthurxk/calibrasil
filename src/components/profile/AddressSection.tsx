import { useState } from "react";
import { MapPin, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUserAddresses, UserAddress, AddressInput } from "@/hooks/useUserAddresses";
import { AddressCard } from "./AddressCard";
import { AddressFormDialog } from "./AddressFormDialog";

export const AddressSection = () => {
  const { addresses, isLoading, addAddress, updateAddress, deleteAddress, setDefaultAddress, canAddMore, maxAddresses } = useUserAddresses();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSave = async (data: AddressInput): Promise<boolean> => {
    if (editingAddress) {
      return updateAddress(editingAddress.id, data);
    }
    return addAddress(data);
  };

  const handleEdit = (address: UserAddress) => {
    setEditingAddress(address);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingAddress(null);
    setIsFormOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteAddress(deletingId);
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Meus Endereços
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Meus Endereços
              </CardTitle>
              <CardDescription>
                {addresses.length}/{maxAddresses} endereços salvos
              </CardDescription>
            </div>
            <Button onClick={handleAdd} disabled={!canAddMore} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Você ainda não tem endereços salvos.</p>
              <p className="text-sm">Adicione um endereço para agilizar suas compras.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeletingId(id)}
                  onSetDefault={setDefaultAddress}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddressFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        address={editingAddress}
        onSave={handleSave}
        isFirstAddress={addresses.length === 0}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir endereço?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O endereço será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
