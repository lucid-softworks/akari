import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Toggles the `automated` self-label on the user's profile, marking
 * the account as a bot or other automated poster. atproto clients can
 * show or hide accounts with this label depending on user preference.
 */
export function useUpdateAccountAutomated() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (automated: boolean) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      await api.setAccountAutomated(token, currentAccount.did, automated);
      return automated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
}
