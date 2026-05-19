import { useInfiniteQuery } from '@tanstack/react-query';

import { getAuthorFeedPage } from '@/hooks/queries/microcosm';
import { useAcceptLabelerDids } from '@/hooks/queries/useAcceptLabelerDids';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { apiForAccount } from '@/utils/blueskyApi';
/**
 * Infinite query hook for fetching a user's replies
 * @param identifier - The user's handle or DID
 * @param limit - Number of posts to fetch per page (default: 20)
 */
export function useAuthorReplies(identifier: string | undefined, limit: number = 20) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();
  const acceptLabelers = useAcceptLabelerDids();

  return useInfiniteQuery({
    queryKey: queryKeys.author.replies(identifier, limit, currentAccount?.pdsUrl, appViewEnabled),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!identifier) throw new Error('No identifier provided');

      if (!appViewEnabled) {
        const page = await getAuthorFeedPage({
          identifier,
          filter: 'posts_with_replies',
          limit,
          cursor: pageParam,
        });
        // Microcosm path: only return actual replies (records with a `reply` field)
        // since the AppView's `posts_with_replies` includes original posts too but
        // the consumer here filters to replies-only via select.
        const replies = page.feed.flatMap((item) =>
          (item.post.record as { reply?: unknown } | undefined)?.reply ? [item.post] : [],
        );
        return { replies, cursor: page.cursor };
      }

      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      const feed = await api.getAuthorFeed(
        token,
        identifier,
        limit,
        pageParam,
        'posts_with_replies',
        acceptLabelers,
      );

      // Map the feed items to posts (they should already be filtered for replies by the API)
      const replies = feed.feed.map((item) => item.post);

      // Deduplicate posts by URI to prevent duplicate keys
      const uniqueReplies = replies.filter((post, index, self) => index === self.findIndex((p) => p.uri === post.uri));

      return {
        replies: uniqueReplies,
        cursor: feed.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.replies),
    enabled: !!identifier && (appViewEnabled ? !!token : true),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
