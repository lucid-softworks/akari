import { useInfiniteQuery } from '@tanstack/react-query';

import type { BlueskyMutesResponse } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/** Paginated list of accounts the current user has muted. */
export function useMutes() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useInfiniteQuery<BlueskyMutesResponse>({
    queryKey: queryKeys.mutes.list(currentAccount?.did),
    enabled: !!token && !!currentAccount?.pdsUrl,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      return api.getMutes(token, 50, pageParam as string | undefined);
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  });
}
