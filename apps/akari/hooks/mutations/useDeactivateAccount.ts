import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Deactivates the account. Pass `deleteAfter` (ISO 8601) to schedule a
 * hard delete; otherwise the deactivation is reversible by signing back
 * in.
 */
export function useDeactivateAccount() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (deleteAfter?: string) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      await api.deactivateAccount(token, deleteAfter);
    },
    onSuccess: () => {
      // The account is now deactivated server-side; flush auth/session and
      // profile caches so any post-deactivation UI re-reads the new state.
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.session.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.forDid(currentAccount?.did) });
    },
  });
}
