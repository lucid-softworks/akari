import { BlueskyApi, type BlueskyApiClientOptions, type BlueskyFeed } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedBluesky } from '@/hooks/useAuthenticatedBluesky';

const FEED_GENERATORS_STALE_TIME = 10 * 60 * 1000; // 10 minutes

export const feedGeneratorsQueryOptions = (
  feedUris: string[],
  token: string,
  pdsUrl: string,
  apiOptions: BlueskyApiClientOptions,
) => ({
  queryKey: ['feedGenerators', feedUris, pdsUrl] as const,
  queryFn: async (): Promise<{ feeds: BlueskyFeed[] }> => {
    if (!token) throw new Error('No access token');
    if (!pdsUrl) throw new Error('No PDS URL available');
    if (feedUris.length === 0) return { feeds: [] };

    const api = new BlueskyApi(pdsUrl, apiOptions);
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
  const apiOptions = useAuthenticatedBluesky();

  return useQuery({
    ...feedGeneratorsQueryOptions(feedUris, token ?? '', currentAccount?.pdsUrl ?? '', apiOptions),
    enabled: !!token && !!currentAccount?.pdsUrl && feedUris.length > 0,
  });
}
