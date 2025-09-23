import { useMutation } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

type MuteThreadVariables = {
  /** URI of the root post for the thread */
  root: string;
};

/**
 * Mutation hook for muting a conversation thread
 */
export function useMuteThread() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationKey: ['muteThread'],
    mutationFn: async ({ root }: MuteThreadVariables) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl);
      return await api.muteThread(token, root);
    },
  });
}
