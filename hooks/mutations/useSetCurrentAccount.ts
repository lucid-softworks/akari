import { Account } from '@/types/account';
import { storage } from '@/utils/secureStorage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation hook for setting the current account
 */
export function useSetCurrentAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: Account) => {
      return account;
    },
    onSuccess: async (account) => {
      queryClient.setQueryData(['currentAccount'], account);

      // Manually persist the updated current account query
      storage.setItem('currentAccount', account);
    },
  });
}
