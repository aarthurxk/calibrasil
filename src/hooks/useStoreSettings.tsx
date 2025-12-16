import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ShippingMode = 'correios' | 'free' | 'fixed';

interface StoreSettings {
  free_shipping_threshold: number;
  standard_shipping_rate: number;
  delivery_min_days: number;
  delivery_max_days: number;
  shipping_mode: ShippingMode;
  store_pickup_enabled: boolean;
  store_pickup_address: string | null;
}

const DEFAULT_SETTINGS: StoreSettings = {
  free_shipping_threshold: 250,
  standard_shipping_rate: 29.90,
  delivery_min_days: 5,
  delivery_max_days: 10,
  shipping_mode: 'correios',
  store_pickup_enabled: true,
  store_pickup_address: 'Shopping RioMar, Av. República do Líbano, 251 - Piso L1, Recife - PE',
};

export const useStoreSettings = () => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['store-settings-public'],
    queryFn: async () => {
      // Fetch shipping config and additional fields
      const { data, error } = await supabase
        .from('store_settings')
        .select('free_shipping_threshold, standard_shipping_rate, delivery_min_days, delivery_max_days, shipping_mode, store_pickup_enabled, store_pickup_address')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching store settings:', error);
        return DEFAULT_SETTINGS;
      }

      return {
        free_shipping_threshold: data?.free_shipping_threshold ?? DEFAULT_SETTINGS.free_shipping_threshold,
        standard_shipping_rate: data?.standard_shipping_rate ?? DEFAULT_SETTINGS.standard_shipping_rate,
        delivery_min_days: data?.delivery_min_days ?? DEFAULT_SETTINGS.delivery_min_days,
        delivery_max_days: data?.delivery_max_days ?? DEFAULT_SETTINGS.delivery_max_days,
        shipping_mode: (data?.shipping_mode as ShippingMode) ?? DEFAULT_SETTINGS.shipping_mode,
        store_pickup_enabled: data?.store_pickup_enabled ?? DEFAULT_SETTINGS.store_pickup_enabled,
        store_pickup_address: data?.store_pickup_address ?? DEFAULT_SETTINGS.store_pickup_address,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    isLoading,
  };
};
