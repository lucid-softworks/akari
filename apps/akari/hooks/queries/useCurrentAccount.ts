import { storage } from '@/utils/secureStorage';
import { useQuery } from '@tanstack/react-query';

/**
 * Query hook for getting the current account
 */
export function useCurrentAccount() {
  return useQuery({
    queryKey: ['currentAccount'],
    queryFn: () => {
      return storage.getItem('currentAccount');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
