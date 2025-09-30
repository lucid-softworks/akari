import { useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { BlueskyApi } from '@/bluesky-api';

/**
 * Infinite query hook for fetching a user's posts with videos
 * @param identifier - The user's handle or DID
 * @param limit - Number of posts to fetch per page (default: 20)
 */
export function useAuthorVideos(identifier: string | undefined, limit: number = 20) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useInfiniteQuery({
    queryKey: ['authorVideos', identifier, limit, currentAccount?.pdsUrl],
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl);
      const feed = await api.getAuthorVideos(identifier, limit, pageParam);

      // Map the feed items to posts (they should already be filtered for videos by the API)
      const videoPosts = feed.feed.map((item) => item.post);

      // Deduplicate posts by URI to prevent duplicate keys
      const uniqueVideoPosts = videoPosts.filter((post, index, self) => index === self.findIndex((p) => p.uri === post.uri));

      return {
        videos: uniqueVideoPosts,
        cursor: feed.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.videos),
    enabled: !!identifier && !!token,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
