import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StoreSettings {
  free_shipping_threshold: number;
  standard_shipping_rate: number;
}

const DEFAULT_SETTINGS: StoreSettings = {
  free_shipping_threshold: 250,
  standard_shipping_rate: 29.90,
};

export const useStoreSettings = () => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['store-settings-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('free_shipping_threshold, standard_shipping_rate')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching store settings:', error);
        return DEFAULT_SETTINGS;
      }

      return {
        free_shipping_threshold: data?.free_shipping_threshold ?? DEFAULT_SETTINGS.free_shipping_threshold,
        standard_shipping_rate: data?.standard_shipping_rate ?? DEFAULT_SETTINGS.standard_shipping_rate,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    isLoading,
  };
};
