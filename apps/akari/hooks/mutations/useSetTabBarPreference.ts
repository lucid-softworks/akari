import { useMutation, useQueryClient } from '@tanstack/react-query';

import { TAB_BAR_PREFERENCE_QUERY_KEY, type TabBarPreference } from '@/hooks/queries/useTabBarPreference';
import { storage } from '@/utils/secureStorage';

export function useSetTabBarPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preference: TabBarPreference) => {
      return preference;
    },
    onSuccess: (preference) => {
      queryClient.setQueryData(TAB_BAR_PREFERENCE_QUERY_KEY, preference);
      storage.setItem('tabBarPreference', preference);
    },
  });
}
