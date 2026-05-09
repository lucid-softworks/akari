import { storage } from '@/utils/secureStorage';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';

/**
 * Query hook for getting the current account
 */
export function useCurrentAccount() {
  return useQuery({
    queryKey: queryKeys.currentAccount(),
    queryFn: () => {
      return storage.getItem('currentAccount');
    },
    initialData: () => storage.getItem('currentAccount') ?? undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
