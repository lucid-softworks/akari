import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

type BlockListParams =
  | { action: 'block'; list: string }
  | { action: 'unblock'; listblockUri: string };

/**
 * Subscribe-as-block to a moderation list (creates a `listblock` record on
 * the user's repo) or unsubscribe (deletes that record).
 */
export function useBlockActorList() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (params: BlockListParams) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!currentAccount.did) throw new Error('No user DID available');
      const api = apiForAccount(currentAccount);

      if (params.action === 'block') {
        return api.blockActorList(token, currentAccount.did, params.list);
      }
      return api.unblockActorList(token, params.listblockUri);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.moderationLists.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
    },
  });
}
