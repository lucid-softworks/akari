import { storage } from '@/utils/secureStorage';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';

/**
 * Query hook for getting all accounts. Returns [] when nothing is
 * persisted yet, so consumers can render directly without `?? []`.
 */
export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts(),
    queryFn: () => {
      return storage.getItem('accounts') ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
