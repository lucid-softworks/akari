import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Account } from '@/types/account';
import { storage } from '@/utils/secureStorage';

type SetAuthenticationInput = {
  token: string;
  refreshToken: string;
  did: string;
  handle: string;
  pdsUrl?: string;
  displayName?: string | null;
  avatar?: string | null;
};

const resolveAvatar = (avatar: string | null | undefined, previous?: string) => {
  if (avatar === undefined) {
    return previous;
  }

  return avatar ?? undefined;
};

/**
 * Mutation hook for setting all authentication data at once
 */
export function useSetAuthentication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['setAuthentication'],
    mutationFn: async (input: SetAuthenticationInput) => input,
    onSuccess: async ({
      token,
      refreshToken,
      did,
      handle,
      pdsUrl,
      displayName,
      avatar,
    }) => {
      queryClient.setQueryData(['jwtToken'], token);
      queryClient.setQueryData(['refreshToken'], refreshToken);

      const cachedAccount =
        (queryClient.getQueryData<Account | null>(['currentAccount']) ?? null) ||
        storage.getItem('currentAccount');

      const mergedAccount: Account = {
        ...cachedAccount,
        did,
        handle,
        jwtToken: token,
        refreshToken,
        pdsUrl: pdsUrl ?? cachedAccount?.pdsUrl,
        displayName: displayName ?? cachedAccount?.displayName,
        avatar: resolveAvatar(avatar, cachedAccount?.avatar),
      };

      queryClient.setQueryData(['currentAccount'], mergedAccount);

      const cachedAccounts =
        queryClient.getQueryData<Account[]>(['accounts']) ?? storage.getItem('accounts');

      const accountsList = cachedAccounts ?? [];
      let accountFound = false;
      const updatedAccounts = accountsList.map((account) => {
        if (account.did !== mergedAccount.did) {
          return account;
        }

        accountFound = true;
        return { ...account, ...mergedAccount };
      });

      if (!accountFound) {
        updatedAccounts.push(mergedAccount);
      }

      queryClient.setQueryData(['accounts'], updatedAccounts);

      // Manually persist the updated queries
      storage.setItem('jwtToken', token);
      storage.setItem('refreshToken', refreshToken);
      storage.setItem('currentAccount', mergedAccount);
      storage.setItem('accounts', updatedAccounts);
    },
  });
}
