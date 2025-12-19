import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SellerData {
  id: string;
  name: string;
  code: string;
  discount_percent: number;
}

export const useSeller = (cartTotal: number) => {
  const [appliedSeller, setAppliedSeller] = useState<SellerData | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateSeller = async (code: string): Promise<boolean> => {
    if (!code.trim()) {
      toast.error('Digite um código de vendedor');
      return false;
    }

    setIsValidating(true);

    try {
      // Use secure RPC function that only exposes minimal seller data
      const { data: sellers, error } = await supabase
        .rpc('validate_seller_code', { seller_code: code });
      
      const seller = sellers && sellers.length > 0 ? sellers[0] : null;

      if (error) throw error;

      if (!seller) {
        toast.error('Código de vendedor inválido');
        return false;
      }

      setAppliedSeller({
        id: seller.id,
        name: seller.name,
        code: seller.code,
        discount_percent: seller.discount_percent || 0,
      });

      if (seller.discount_percent && seller.discount_percent > 0) {
        toast.success(`Vendedor: ${seller.name} - ${seller.discount_percent}% de desconto!`);
      } else {
        toast.success(`Vendedor: ${seller.name}`);
      }
      return true;
    } catch (error) {
      console.error('Error validating seller:', error);
      toast.error('Erro ao validar código do vendedor');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const removeSeller = () => {
    setAppliedSeller(null);
    toast.success('Vendedor removido');
  };

  const sellerDiscount = appliedSeller?.discount_percent
    ? (cartTotal * appliedSeller.discount_percent) / 100
    : 0;

  return {
    appliedSeller,
    isValidating,
    validateSeller,
    removeSeller,
    sellerDiscount,
  };
};
