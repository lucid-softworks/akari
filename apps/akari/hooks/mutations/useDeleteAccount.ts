import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Two-step destructive flow. Step one (`requestToken`) emails a
 * confirmation token. Step two (`confirm`) sends that token together
 * with the user's password, and the PDS permanently removes the
 * account.
 */
export function useRequestAccountDelete() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      await api.requestAccountDelete(token);
    },
    onSuccess: () => {
      // PDS now expects a delete-confirmation token on the next call; refresh
      // the preferences blob the account-settings screen reads so any
      // pending-delete state is reflected.
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.forPds(currentAccount?.pdsUrl) });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ password, token: emailToken }: { password: string; token: string }) => {
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      await api.deleteAccount(currentAccount.did, password, emailToken);
    },
    onSuccess: () => {
      // Account no longer exists server-side; wipe every cached query so
      // the post-delete logout flow doesn't render stale data.
      queryClient.invalidateQueries();
    },
  });
}
