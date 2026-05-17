import { useInfiniteQuery } from '@tanstack/react-query';

import { getAuthorFeedPage } from '@/hooks/queries/microcosm';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { apiForAccount } from '@/utils/blueskyApi';
/**
 * Infinite query hook for fetching a user's posts with videos
 * @param identifier - The user's handle or DID
 * @param limit - Number of posts to fetch per page (default: 20)
 */
export function useAuthorVideos(identifier: string | undefined, limit: number = 20) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();

  return useInfiniteQuery({
    queryKey: queryKeys.author.videos(identifier, limit, currentAccount?.pdsUrl, appViewEnabled),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!identifier) throw new Error('No identifier provided');

      if (!appViewEnabled) {
        const page = await getAuthorFeedPage({
          identifier,
          filter: 'posts_with_videos',
          limit,
          cursor: pageParam,
        });
        return { videos: page.feed.map((item) => item.post), cursor: page.cursor };
      }

      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      const feed = await api.getAuthorVideos(token, identifier, limit, pageParam);

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
    enabled: !!identifier && (appViewEnabled ? !!token : true),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
