import { storage } from '@/utils/secureStorage';
import { useQuery } from '@tanstack/react-query';

/**
 * Query hook for getting all accounts
 */
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => {
      return storage.getItem('accounts');
    },
  });
}
