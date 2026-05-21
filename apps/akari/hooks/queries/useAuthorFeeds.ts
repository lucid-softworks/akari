import { useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { CursorPageParam } from '@/hooks/queries/types';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount, apiForPublicAppView } from '@/utils/blueskyApi';
/**
 * Infinite query hook for fetching feeds created by a user
 * @param identifier - The user's handle or DID
 * @param limit - Number of feeds to fetch per page (default: 50)
 */
export function useAuthorFeeds(identifier: string | undefined, limit: number = 50) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useInfiniteQuery({
    queryKey: queryKeys.author.feeds(identifier, limit, currentAccount?.pdsUrl),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!identifier) throw new Error('No identifier provided');

      const useGuestPath = !token || !currentAccount?.pdsUrl;
      const api = useGuestPath ? apiForPublicAppView() : apiForAccount(currentAccount);
      const feeds = await api.getAuthorFeeds(
        useGuestPath ? '' : token,
        identifier,
        limit,
        pageParam,
      );

      return {
        feeds: feeds.feeds,
        cursor: feeds.cursor,
      };
    },
    select: (data) => data.pages.flatMap((page) => page.feeds),
    enabled: !!identifier,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
