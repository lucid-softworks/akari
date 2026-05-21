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
 * Infinite query hook for fetching a user's posts with media
 * @param identifier - The user's handle or DID
 * @param limit - Number of posts to fetch per page (default: 20)
 */
export function useAuthorMedia(identifier: string | undefined, limit: number = 20) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();
  const acceptLabelers = useAcceptLabelerDids();

  return useInfiniteQuery({
    queryKey: queryKeys.author.media(identifier, limit, currentAccount?.pdsUrl, appViewEnabled),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!identifier) throw new Error('No identifier provided');

      if (!appViewEnabled) {
        const page = await getAuthorFeedPage({
          identifier,
          filter: 'posts_with_media',
          limit,
          cursor: pageParam,
        });
        return { media: page.feed.map((item) => item.post), cursor: page.cursor };
      }

      const useGuestPath = !token || !currentAccount?.pdsUrl;
      const api = useGuestPath ? apiForPublicAppView() : apiForAccount(currentAccount);
      const feed = await api.getAuthorFeed(
        useGuestPath ? '' : token,
        identifier,
        limit,
        pageParam,
        'posts_with_media',
        acceptLabelers,
      );

      // Map the feed items to posts (they should already be filtered for media by the API)
      const mediaPosts = feed.feed.map((item) => item.post);

      // Deduplicate posts by URI to prevent duplicate keys
      const uniqueMediaPosts = mediaPosts.filter((post, index, self) => index === self.findIndex((p) => p.uri === post.uri));

      return {
        media: uniqueMediaPosts,
        cursor: feed.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.media),
    enabled: !!identifier,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
