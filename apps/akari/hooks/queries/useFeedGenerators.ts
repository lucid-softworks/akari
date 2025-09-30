import { BlueskyApi, type BlueskyFeed } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useQuery } from '@tanstack/react-query';

const FEED_GENERATORS_STALE_TIME = 10 * 60 * 1000; // 10 minutes

export const feedGeneratorsQueryOptions = (feedUris: string[], pdsUrl: string, token?: string) => ({
  queryKey: ['feedGenerators', feedUris, pdsUrl] as const,
  queryFn: async (): Promise<{ feeds: BlueskyFeed[] }> => {
    if (feedUris.length === 0) return { feeds: [] };
    if (!token) throw new Error('No access token');
    if (!pdsUrl) throw new Error('No PDS URL available');

    const api = new BlueskyApi(pdsUrl);
    return await api.getFeedGenerators(feedUris);
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
    ...feedGeneratorsQueryOptions(feedUris, currentAccount?.pdsUrl ?? '', token),
    enabled: !!currentAccount?.pdsUrl && feedUris.length > 0,
  });
}
