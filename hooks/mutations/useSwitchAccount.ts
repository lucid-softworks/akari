import { Account } from '@/types/account';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAuthentication } from './useSetAuthentication';

/**
 * Mutation hook for switching accounts
 */
export function useSwitchAccount() {
  const queryClient = useQueryClient();
  const setAuthMutation = useSetAuthentication();

  return useMutation({
    mutationFn: async (account: Account) => {
      return account;
    },
    onSuccess: async (account) => {
      // Set the current account
      queryClient.setQueryData(['currentAccount'], account);

      // Set authentication data for the new account
      await setAuthMutation.mutateAsync({
        token: account.jwtToken,
        refreshToken: account.refreshToken,
        did: account.did,
        handle: account.handle,
        pdsUrl: account.pdsUrl,
      });
    },
  });
}
