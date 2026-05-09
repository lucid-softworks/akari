import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Toggles the `!no-unauthenticated` self-label on the current user's
 * profile record. The label is the canonical "discourage apps from
 * showing this account to logged-out users" mechanism — atproto
 * AppViews and labelers honour it client-side.
 */
export function useUpdateLoggedOutVisibility() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (discouraged: boolean) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      await api.setLoggedOutVisibilityDiscouraged(token, currentAccount.did, discouraged);
      return discouraged;
    },
    onSuccess: () => {
      // Invalidate the raw profile record so the toggle reflects new state,
      // and the public profile view so any UI showing the label refreshes.
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
}
