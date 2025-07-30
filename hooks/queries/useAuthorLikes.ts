import { useInfiniteQuery } from '@tanstack/react-query';

import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { blueskyApi } from '@/utils/blueskyApi';

/**
 * Infinite query hook for fetching posts that a user has liked
 * @param identifier - The user's handle or DID
 * @param limit - Number of posts to fetch per page (default: 20)
 */
export function useAuthorLikes(identifier: string | undefined, limit: number = 20) {
  const { data: token } = useJwtToken();

  return useInfiniteQuery({
    queryKey: ['authorLikes', identifier, limit],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');

      const feed = await blueskyApi.getAuthorFeed(token, identifier, limit, pageParam);

      // Filter to only show posts that the user has liked
      const likes = feed.feed
        .filter((item) => {
          // Only include posts that the user has liked
          return item.post.viewer?.like;
        })
        .map((item) => item.post);

      // Deduplicate posts by URI to prevent duplicate keys
      const uniqueLikes = likes.filter((post, index, self) => index === self.findIndex((p) => p.uri === post.uri));

      return {
        likes: uniqueLikes,
        cursor: feed.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.likes),
    enabled: !!identifier && !!token,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
