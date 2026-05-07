import { useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Infinite query hook for fetching the authenticated user's bookmarks
 * @param limit - Number of bookmarks to fetch per page (default: 20)
 */
export function useBookmarks(limit: number = 20) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useInfiniteQuery({
    queryKey: ['bookmarks', limit, currentAccount?.did],
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      return await api.getBookmarks(token, limit, pageParam);
    },
    enabled: !!token && !!currentAccount?.did,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      const bookmarkCount = lastPage.bookmarks?.length ?? 0;

      if (!lastPage.cursor || bookmarkCount < limit) {
        return undefined;
      }

      return lastPage.cursor;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
