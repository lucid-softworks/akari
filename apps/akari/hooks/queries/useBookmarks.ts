import { useInfiniteQuery } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import type { BlueskyBookmarksResponse } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

/**
 * Infinite query hook for fetching the authenticated user's bookmarks
 * @param limit - Number of bookmarks to fetch per page (default: 20)
 */
export function useBookmarks(limit: number = 20) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useInfiniteQuery<BlueskyBookmarksResponse>({
    queryKey: ['bookmarks', limit, currentAccount?.did],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl);
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
