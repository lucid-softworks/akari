import { useQuery } from '@tanstack/react-query';

import { storage } from '@/utils/secureStorage';

export type TabBarPreference = 'custom' | 'native';

export const TAB_BAR_PREFERENCE_QUERY_KEY = ['tabBarPreference'] as const;

const DEFAULT_TAB_BAR_PREFERENCE: TabBarPreference = 'custom';

export function useTabBarPreference() {
  return useQuery({
    queryKey: TAB_BAR_PREFERENCE_QUERY_KEY,
    queryFn: () => {
      return storage.getItem('tabBarPreference') ?? DEFAULT_TAB_BAR_PREFERENCE;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
