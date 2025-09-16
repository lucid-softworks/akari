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
      const cachedAccounts = queryClient.getQueryData<Account[]>(['accounts']) ?? [];
      const storedAccounts = storage.getItem('accounts') ?? [];

      const accountsByDid = new Map<string, Account>();

      for (const account of [...storedAccounts, ...cachedAccounts]) {
        accountsByDid.set(account.did, account);
      }

      const existingAccount = accountsByDid.get(newAccount.did);
      const mergedAccount = existingAccount
        ? {
            ...existingAccount,
            ...newAccount,
          }
        : newAccount;

      accountsByDid.set(newAccount.did, mergedAccount);

      const mergedAccounts = Array.from(accountsByDid.values());

      queryClient.setQueryData(['accounts'], mergedAccounts);

      // Manually persist the updated accounts query
      storage.setItem('accounts', mergedAccounts);
    },
  });
}
