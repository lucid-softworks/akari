import { useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { BlueskyApi } from '@/bluesky-api';
import { useAuthenticatedBluesky } from '@/hooks/useAuthenticatedBluesky';

/**
 * Infinite query hook for fetching feed posts
 * @param feedUri - The feed URI to fetch posts from
 * @param limit - Number of posts to fetch per page (default: 20)
 */
export function useFeed(feedUri: string | null, limit: number = 20) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const apiOptions = useAuthenticatedBluesky();

  return useInfiniteQuery({
    queryKey: ['feed', feedUri, currentAccount?.pdsUrl],
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!token) throw new Error('No access token');
      if (!feedUri) throw new Error('No feed URI provided');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl, apiOptions);
      return await api.getFeed(token, feedUri, limit, pageParam);
    },
    enabled: !!feedUri && !!token,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
