import { useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { BlueskyApi } from '@/bluesky-api';
import { useAuthenticatedBluesky } from '@/hooks/useAuthenticatedBluesky';

/**
 * Infinite query hook for fetching a user's original posts (not replies or reposts)
 * @param identifier - The user's handle or DID
 * @param limit - Number of posts to fetch per page (default: 20)
 */
export function useAuthorPosts(identifier: string | undefined, limit: number = 20) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const apiOptions = useAuthenticatedBluesky();

  return useInfiniteQuery({
    queryKey: ['authorPosts', identifier, limit, currentAccount?.pdsUrl],
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl, apiOptions);
      const feed = await api.getAuthorFeed(token, identifier, limit, pageParam);

      // Filter to only show original posts (not reposts or replies)
      const originalPosts = feed.feed
        .filter((item) => {
          // Only include posts that are not reposts and not replies
          return !item.reason && !item.reply;
        })
        .map((item) => item.post);

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
    enabled: !!identifier && !!token,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
