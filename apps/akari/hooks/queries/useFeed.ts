import { useInfiniteQuery } from '@tanstack/react-query';

import { useAcceptLabelerDids } from '@/hooks/queries/useAcceptLabelerDids';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount, apiForPublicAppView } from '@/utils/blueskyApi';
/**
 * Infinite query hook for fetching feed posts
 * @param feedUri - The feed URI to fetch posts from
 * @param limit - Number of posts to fetch per page (default: 20)
 */
export function useFeed(feedUri: string | null, limit: number = 20) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const acceptLabelers = useAcceptLabelerDids();

  return useInfiniteQuery({
    queryKey: queryKeys.feed.detail(feedUri, currentAccount?.pdsUrl),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!feedUri) throw new Error('No feed URI provided');

      // Guest path: hit the public AppView directly with no token. The
      // shared API client treats `accessJwt === ''` as "public read"
      // and skips the Authorization header.
      if (!token || !currentAccount?.pdsUrl) {
        const api = apiForPublicAppView();
        return await api.getFeed('', feedUri, limit, pageParam, acceptLabelers);
      }

      const api = apiForAccount(currentAccount);
      return await api.getFeed(token, feedUri, limit, pageParam, acceptLabelers);
    },
    enabled: !!feedUri,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Cap accumulated pages so a long scrolling session doesn't bloat
    // memory unbounded. On `fetchNextPage` past this limit, RQ drops
    // the oldest page. 25 pages × 20 items = 500-item working set.
    maxPages: 25,
  });
}
