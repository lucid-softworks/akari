import { useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { BlueskyApi } from '@/bluesky-api';

/**
 * Infinite query hook for fetching Whtwnd blog posts authored by a user
 * @param identifier - The user's handle or DID
 * @param limit - Number of posts to fetch per page (default: 25)
 */
export function useAuthorWhtwndPosts(identifier: string | undefined, limit: number = 25) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useInfiniteQuery({
    queryKey: ['authorWhtwndPosts', identifier, limit, currentAccount?.pdsUrl],
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!token) throw new Error('No access token');
      if (!identifier) throw new Error('No identifier provided');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl);
      const entries = await api.getAuthorWhtwndPosts(token, identifier, limit, pageParam);

      return {
        posts: entries.records,
        cursor: entries.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.posts),
    enabled: !!identifier && !!token,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000,
  });
}
