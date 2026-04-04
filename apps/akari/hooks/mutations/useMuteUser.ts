import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { BlueskyApi } from '@/bluesky-api';

export function useMuteUser() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ actor, action }: { actor: string; action: 'mute' | 'unmute' }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl);

      if (action === 'mute') {
        return await api.muteUser(token, actor);
      } else {
        return await api.unmuteUser(token, actor);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timeline'] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
