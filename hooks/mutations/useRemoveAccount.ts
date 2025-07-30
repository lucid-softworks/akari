import { Account } from '@/types/account';
import { storage } from '@/utils/secureStorage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation hook for removing an account
 */
export function useRemoveAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      return accountId;
    },
    onSuccess: async (accountId) => {
      // Remove the account from the accounts list
      queryClient.setQueryData(['accounts'], (old: Account[] = []) => old.filter((account) => account.did !== accountId));

      // Check if the removed account was the current account
      const currentAccount = queryClient.getQueryData<Account>(['currentAccount']);
      if (currentAccount?.did === accountId) {
        // Set current account to null or the first available account
        const remainingAccounts = queryClient.getQueryData<Account[]>(['accounts']) || [];
        const newCurrentAccount = remainingAccounts.length > 0 ? remainingAccounts[0] : null;
        queryClient.setQueryData(['currentAccount'], newCurrentAccount);

        // Manually persist the updated current account query
        storage.setItem('currentAccount', newCurrentAccount);
      }

      // Manually persist the updated accounts query
      const oldAccounts = storage.getItem('accounts') ?? [];
      storage.setItem(
        'accounts',
        oldAccounts.filter((account) => account.did !== accountId),
      );
    },
  });
}
