import { queryKeys } from '@/hooks/queryKeys';
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
        displayName: account.displayName ?? null,
        avatar: account.avatar ?? null,
      });

      // Account-scoped caches (timeline, notifications, conversations,
      // preferences, etc.) belong to the previous user. Drop them so the
      // newly active account refetches its own data.
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.forDid(account.did) });
    },
  });
}
