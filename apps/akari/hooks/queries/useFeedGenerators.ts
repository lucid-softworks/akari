import { type BlueskyFeed } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { apiForPdsUrl } from '@/utils/blueskyApi';

const FEED_GENERATORS_STALE_TIME = 10 * 60 * 1000; // 10 minutes

export const feedGeneratorsQueryOptions = (feedUris: string[], token: string, pdsUrl: string) => ({
  queryKey: queryKeys.feedGenerators(feedUris, pdsUrl),
  queryFn: async (): Promise<{ feeds: BlueskyFeed[] }> => {
    if (!token) throw new Error('No access token');
    if (!pdsUrl) throw new Error('No PDS URL available');
    if (feedUris.length === 0) return { feeds: [] };

    const api = apiForPdsUrl(pdsUrl);
    return await api.getFeedGenerators(token, feedUris);
  },
  staleTime: FEED_GENERATORS_STALE_TIME,
});

/**
 * Query hook for fetching feed generator metadata
 * @param feedUris - Array of feed URIs to get metadata for
 */
export function useFeedGenerators(feedUris: string[]) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    ...feedGeneratorsQueryOptions(feedUris, token ?? '', currentAccount?.pdsUrl ?? ''),
    enabled: !!token && !!currentAccount?.pdsUrl && feedUris.length > 0,
  });
}
