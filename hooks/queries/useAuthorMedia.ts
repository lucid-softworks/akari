import { useInfiniteQuery } from '@tanstack/react-query';

import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { blueskyApi } from '@/utils/blueskyApi';

/**
 * Infinite query hook for fetching a user's posts with media
 * @param identifier - The user's handle or DID
 * @param limit - Number of posts to fetch per page (default: 20)
 */
export function useAuthorMedia(identifier: string | undefined, limit: number = 20) {
  const { data: token } = useJwtToken();

  return useInfiniteQuery({
    queryKey: ['authorMedia', identifier, limit],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');

      const feed = await blueskyApi.getAuthorFeed(token, identifier, limit, pageParam);

      // Filter to only show posts with media (images, videos, etc.)
      const mediaPosts = feed.feed
        .filter((item) => {
          // Only include posts that have media (embeds)
          return (
            item.post.embed &&
            (item.post.embed.$type === 'app.bsky.embed.images#view' ||
              item.post.embed.$type === 'app.bsky.embed.external#view' ||
              item.post.embed.$type === 'app.bsky.embed.record#view' ||
              item.post.embed.$type === 'app.bsky.embed.recordWithMedia#view' ||
              item.post.embeds?.some(
                (embed) =>
                  embed.$type === 'app.bsky.embed.images#view' ||
                  embed.$type === 'app.bsky.embed.external#view' ||
                  embed.$type === 'app.bsky.embed.record#view' ||
                  embed.$type === 'app.bsky.embed.recordWithMedia#view',
              ))
          );
        })
        .map((item) => item.post);

      // Deduplicate posts by URI to prevent duplicate keys
      const uniqueMediaPosts = mediaPosts.filter((post, index, self) => index === self.findIndex((p) => p.uri === post.uri));

      return {
        media: uniqueMediaPosts,
        cursor: feed.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.media),
    enabled: !!identifier && !!token,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
