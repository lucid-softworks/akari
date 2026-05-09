import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import type { PostControls } from '@/utils/postControls';
import { DEFAULT_POST_CONTROLS } from '@/utils/postControls';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Writes threadgate + postgate records for a freshly-created post. The
 * composer calls this immediately after `useCreatePost` resolves with the
 * post URI; on default controls (everyone can reply, quotes allowed) we
 * skip the writes entirely since atproto treats absence as the default.
 */
export function usePostControls() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ postUri, controls }: { postUri: string; controls: PostControls }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);

      const isReplyDefault =
        controls.replyAllow.type === DEFAULT_POST_CONTROLS.replyAllow.type;
      const isQuoteDefault = controls.allowQuote === DEFAULT_POST_CONTROLS.allowQuote;

      const tasks: Promise<unknown>[] = [];
      if (!isReplyDefault) {
        tasks.push(api.setThreadgate(token, currentAccount.did, postUri, controls.replyAllow));
      }
      if (!isQuoteDefault) {
        tasks.push(api.setPostgate(token, currentAccount.did, postUri, { allowQuote: controls.allowQuote }));
      }
      await Promise.all(tasks);
    },
    onSuccess: () => {
      // Invalidate the thread cache for this post so subsequent loads see
      // the new gate state.
      queryClient.invalidateQueries({ queryKey: queryKeys.postThread.all });
    },
  });
}
