import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';
export function useMuteUser() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ actor, action }: { actor: string; action: 'mute' | 'unmute' }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);

      if (action === 'mute') {
        return await api.muteUser(token, actor);
      } else {
        return await api.unmuteUser(token, actor);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.mutes.all });
    },
  });
}
