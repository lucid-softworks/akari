import { Account } from '@/types/account';
import { storage } from '@/utils/secureStorage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation hook for adding an account
 */
export function useAddAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: Account) => {
      console.info('account', account);
      return account;
    },
    onSuccess: async (newAccount) => {
      queryClient.setQueryData(['accounts'], (old: Account[] | undefined) => [...(old ?? []), newAccount]);

      // Manually persist the updated accounts query
      const oldAccounts = storage.getItem('accounts') ?? [];
      console.info('oldAccounts', oldAccounts);
      storage.setItem('accounts', [...oldAccounts, newAccount]);
    },
  });
}
