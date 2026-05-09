import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

type MuteListParams = { list: string; action: 'mute' | 'unmute' };

/** Subscribe-as-mute / unsubscribe a moderation list. */
export function useMuteActorList() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ list, action }: MuteListParams) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      return action === 'mute'
        ? api.muteActorList(token, list)
        : api.unmuteActorList(token, list);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.moderationLists.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
  });
}
