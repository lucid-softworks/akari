import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Calls `com.atproto.identity.updateHandle`. The PDS rejects the
 * change if the handle is unavailable or doesn't satisfy host
 * policies; the underlying error is surfaced to the caller.
 */
export function useUpdateHandle() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (handle: string) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      await api.updateHandle(token, handle);
      return handle;
    },
    onSuccess: () => {
      // Refresh anything that exposes the user's handle.
      queryClient.invalidateQueries({ queryKey: queryKeys.session.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentAccount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts() });
    },
  });
}
