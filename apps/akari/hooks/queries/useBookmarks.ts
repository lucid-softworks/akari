import { useInfiniteQuery } from '@tanstack/react-query';

import { useAcceptLabelerDids } from '@/hooks/queries/useAcceptLabelerDids';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { readAppViewEnabled } from '@/hooks/useAppViewSettings';
import { AppViewRequiredError } from '@/utils/appView';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Infinite query hook for fetching the authenticated user's bookmarks
 * @param limit - Number of bookmarks to fetch per page (default: 50)
 */
export function useBookmarks(limit: number = 50) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();
  const acceptLabelers = useAcceptLabelerDids();

  return useInfiniteQuery({
    queryKey: queryKeys.bookmarks.list(limit, currentAccount?.did, appViewEnabled),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!readAppViewEnabled()) throw new AppViewRequiredError('bookmarks');
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      return await api.getBookmarks(token, limit, pageParam, acceptLabelers);
    },
    enabled: !!token && !!currentAccount?.did,
    initialPageParam: undefined as string | undefined,
    // Trust the cursor as the authoritative "more pages available" signal.
    // A previous version short-circuited when `bookmarks.length < limit`,
    // but the AppView can return short pages while a cursor is still
    // populated (server-side filtering, deleted records hidden in
    // hydration, etc.). Short-circuiting on length under-reads the
    // bookmark list — bookmarks the user sees in bsky.app would never
    // load because pagination stopped on the first short page.
    getNextPageParam: (lastPage) => lastPage.cursor || undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
