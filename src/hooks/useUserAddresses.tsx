import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  zip: string;
  street: string;
  house_number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type AddressInput = Omit<UserAddress, "id" | "user_id" | "created_at" | "updated_at">;

const MAX_ADDRESSES = 3;

export const useUserAddresses = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAddresses((data as UserAddress[]) || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const addAddress = async (address: AddressInput): Promise<boolean> => {
    if (!user) return false;

    if (addresses.length >= MAX_ADDRESSES) {
      toast.error(`Você pode salvar no máximo ${MAX_ADDRESSES} endereços`);
      return false;
    }

    try {
      // If this is the first address or marked as default, update others
      if (address.is_default && addresses.length > 0) {
        await supabase
          .from("user_addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      // If first address, make it default
      const isDefault = addresses.length === 0 ? true : address.is_default;

      const { error } = await supabase.from("user_addresses").insert({
        user_id: user.id,
        ...address,
        is_default: isDefault,
      });

      if (error) throw error;

      toast.success("Endereço adicionado com sucesso!");
      await fetchAddresses();
      return true;
    } catch (error) {
      console.error("Error adding address:", error);
      toast.error("Erro ao adicionar endereço");
      return false;
    }
  };

  const updateAddress = async (id: string, address: Partial<AddressInput>): Promise<boolean> => {
    if (!user) return false;

    try {
      // If setting as default, unset others first
      if (address.is_default) {
        await supabase
          .from("user_addresses")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .neq("id", id);
      }

      const { error } = await supabase
        .from("user_addresses")
        .update(address)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Endereço atualizado com sucesso!");
      await fetchAddresses();
      return true;
    } catch (error) {
      console.error("Error updating address:", error);
      toast.error("Erro ao atualizar endereço");
      return false;
    }
  };

  const deleteAddress = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const addressToDelete = addresses.find((a) => a.id === id);
      
      const { error } = await supabase
        .from("user_addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      // If deleted was default, make the first remaining address default
      if (addressToDelete?.is_default && addresses.length > 1) {
        const remaining = addresses.filter((a) => a.id !== id);
        if (remaining.length > 0) {
          await supabase
            .from("user_addresses")
            .update({ is_default: true })
            .eq("id", remaining[0].id);
        }
      }

      toast.success("Endereço removido com sucesso!");
      await fetchAddresses();
      return true;
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Erro ao remover endereço");
      return false;
    }
  };

  const setDefaultAddress = async (id: string): Promise<boolean> => {
    return updateAddress(id, { is_default: true });
  };

  const getDefaultAddress = (): UserAddress | undefined => {
    return addresses.find((a) => a.is_default) || addresses[0];
  };

  return {
    addresses,
    isLoading,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getDefaultAddress,
    canAddMore: addresses.length < MAX_ADDRESSES,
    maxAddresses: MAX_ADDRESSES,
    refetch: fetchAddresses,
  };
};
