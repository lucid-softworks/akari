import { useMutation } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { apiForAccount } from '@/utils/blueskyApi';

/** Asks the PDS to email a verification token for an upcoming email change. */
export function useRequestEmailUpdate() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (): Promise<{ tokenRequired: boolean }> => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      return api.requestEmailUpdate(token);
    },
  });
}
