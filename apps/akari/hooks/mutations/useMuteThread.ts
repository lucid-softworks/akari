import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

/**
 * Mutes notifications and feed surfacing for a whole thread, keyed off
 * the conversation root URI. Send the URI of post #0 in the thread —
 * not the post the user is currently looking at, unless that is the
 * root.
 */
export function useMuteThread() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ root, action }: { root: string; action: 'mute' | 'unmute' }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = new BlueskyApi(currentAccount.pdsUrl);
      if (action === 'mute') {
        return await api.muteThread(token, root);
      }
      return await api.unmuteThread(token, root);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['postThread'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
