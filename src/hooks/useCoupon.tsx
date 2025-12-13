import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CouponData {
  code: string;
  discount_percent: number;
  min_purchase: number;
}

export const useCoupon = (cartTotal: number) => {
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateCoupon = async (code: string): Promise<boolean> => {
    if (!code.trim()) {
      toast.error('Digite um código de cupom');
      return false;
    }

    setIsValidating(true);

    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!coupon) {
        toast.error('Cupom inválido ou expirado');
        return false;
      }

      // Check expiration
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        toast.error('Este cupom expirou');
        return false;
      }

      // Check usage limit
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        toast.error('Este cupom atingiu o limite de uso');
        return false;
      }

      // Check minimum purchase
      if (coupon.min_purchase && cartTotal < coupon.min_purchase) {
        toast.error(
          `Valor mínimo para usar este cupom: ${coupon.min_purchase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
        );
        return false;
      }

      setAppliedCoupon({
        code: coupon.code,
        discount_percent: coupon.discount_percent,
        min_purchase: coupon.min_purchase,
      });

      toast.success(`Cupom aplicado! ${coupon.discount_percent}% de desconto`);
      return true;
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast.error('Erro ao validar cupom');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast.success('Cupom removido');
  };

  const discountAmount = appliedCoupon
    ? (cartTotal * appliedCoupon.discount_percent) / 100
    : 0;

  return {
    appliedCoupon,
    isValidating,
    validateCoupon,
    removeCoupon,
    discountAmount,
  };
};
