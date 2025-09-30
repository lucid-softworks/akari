import { Account } from '@/types/account';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAuthentication } from './useSetAuthentication';
import { useSetCurrentAccount } from './useSetCurrentAccount';

/**
 * Mutation hook for switching accounts
 */
export function useSwitchAccount() {
  const queryClient = useQueryClient();
  const setAuthMutation = useSetAuthentication();
  const setCurrentAccountMutation = useSetCurrentAccount();

  return useMutation({
    mutationFn: async (account: Account) => {
      return account;
    },
    onSuccess: async (account) => {
      // Set the current account (updates both cache and storage)
      await setCurrentAccountMutation.mutateAsync(account);

      // Set authentication data for the new account
      await setAuthMutation.mutateAsync({
        token: account.jwtToken,
        refreshToken: account.refreshToken,
        did: account.did,
        handle: account.handle,
        pdsUrl: account.pdsUrl,
        active: account.active,
        status: account.status,
        email: account.email,
        emailConfirmed: account.emailConfirmed,
        emailAuthFactor: account.emailAuthFactor,
        displayName: account.displayName,
        avatar: account.avatar,
      });
    },
  });
}
