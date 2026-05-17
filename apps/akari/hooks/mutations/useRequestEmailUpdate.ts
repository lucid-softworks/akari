import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/** Asks the PDS to email a verification token for an upcoming email change. */
export function useRequestEmailUpdate() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (): Promise<{ tokenRequired: boolean }> => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      return api.requestEmailUpdate(token);
    },
    onSuccess: () => {
      // Server now expects a confirmation token on the next update; refresh
      // the preferences blob the personal-details screen reads from so it
      // reflects the latest tokenRequired/email state.
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.forPds(currentAccount?.pdsUrl) });
    },
  });
}
