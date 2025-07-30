import { useInfiniteQuery } from '@tanstack/react-query';

import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { blueskyApi } from '@/utils/blueskyApi';

/**
 * Infinite query hook for fetching a user's posts with videos
 * @param identifier - The user's handle or DID
 * @param limit - Number of posts to fetch per page (default: 20)
 */
export function useAuthorVideos(identifier: string | undefined, limit: number = 20) {
  const { data: token } = useJwtToken();

  return useInfiniteQuery({
    queryKey: ['authorVideos', identifier, limit],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');

      const feed = await blueskyApi.getAuthorVideos(token, identifier, limit, pageParam);

      // Filter to only show posts with videos
      const videoPosts = feed.feed
        .filter((item) => {
          // Only include posts that have video embeds
          return (
            item.post.embed &&
            (item.post.embed.$type === 'app.bsky.embed.external#view' ||
              item.post.embed.$type === 'app.bsky.embed.recordWithMedia#view' ||
              item.post.embeds?.some(
                (embed) =>
                  embed.$type === 'app.bsky.embed.external#view' || embed.$type === 'app.bsky.embed.recordWithMedia#view',
              ))
          );
        })
        .map((item) => item.post);

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
