import { useInfiniteQuery } from '@tanstack/react-query';

import { getAuthorFeedPage } from '@/hooks/queries/microcosm';
import { useAcceptLabelerDids } from '@/hooks/queries/useAcceptLabelerDids';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { apiForAccount, apiForPublicAppView } from '@/utils/blueskyApi';
/**
 * Infinite query hook for fetching a user's original posts (not replies or reposts)
 * @param identifier - The user's handle or DID
 * @param limit - Number of posts to fetch per page (default: 20)
 */
export function useAuthorPosts(identifier: string | undefined, limit: number = 50) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();
  const acceptLabelers = useAcceptLabelerDids();

  return useInfiniteQuery({
    queryKey: queryKeys.author.posts.list(identifier, limit, currentAccount?.pdsUrl, appViewEnabled),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!identifier) throw new Error('No identifier provided');

      if (!appViewEnabled) {
        const page = await getAuthorFeedPage({ identifier, filter: 'posts', limit, cursor: pageParam });
        return { posts: page.feed.map((item) => item.post), cursor: page.cursor };
      }

      // Guest path: public AppView serves `getAuthorFeed` unauth.
      const useGuestPath = !token || !currentAccount?.pdsUrl;
      const api = useGuestPath ? apiForPublicAppView() : apiForAccount(currentAccount);
      const feed = await api.getAuthorFeed(
        useGuestPath ? '' : token,
        identifier,
        limit,
        pageParam,
        undefined,
        acceptLabelers,
      );

      // Filter to only show original posts (not reposts or replies)
      const originalPosts = feed.feed.flatMap((item) => (!item.reason && !item.reply ? [item.post] : []));

      // Deduplicate posts by URI to prevent duplicate keys
      const uniqueOriginalPosts = originalPosts.filter(
        (post, index, self) => index === self.findIndex((p) => p.uri === post.uri),
      );

      return {
        posts: uniqueOriginalPosts,
        cursor: feed.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.posts),
    enabled: !!identifier,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
