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
      return account;
    },
    onSuccess: async (newAccount) => {
      queryClient.setQueryData(['accounts'], (old: Account[] = []) => [...old, newAccount]);

      // Manually persist the updated accounts query
      const oldAccounts = storage.getItem('accounts') ?? [];
      storage.setItem('accounts', [...oldAccounts, newAccount]);
    },
  });
}
