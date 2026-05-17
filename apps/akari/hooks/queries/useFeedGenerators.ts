import { type BlueskyFeed } from '@/bluesky-api';
import { getFeedGeneratorViews } from '@/hooks/queries/microcosm';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { useQuery } from '@tanstack/react-query';
import { apiForPdsUrl } from '@/utils/blueskyApi';

const FEED_GENERATORS_STALE_TIME = 10 * 60 * 1000; // 10 minutes

export const feedGeneratorsQueryOptions = (
  feedUris: string[],
  token: string,
  pdsUrl: string,
  appViewEnabled = true,
) => ({
  queryKey: queryKeys.feedGenerators(feedUris, pdsUrl, appViewEnabled),
  queryFn: async (): Promise<{ feeds: BlueskyFeed[] }> => {
    if (feedUris.length === 0) return { feeds: [] };

    if (!appViewEnabled) {
      return getFeedGeneratorViews(feedUris);
    }

    if (!token) throw new Error('No access token');
    if (!pdsUrl) throw new Error('No PDS URL available');

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
  const appViewEnabled = useAppViewEnabled();

  return useQuery({
    ...feedGeneratorsQueryOptions(feedUris, token ?? '', currentAccount?.pdsUrl ?? '', appViewEnabled),
    enabled: feedUris.length > 0 && (appViewEnabled ? !!token && !!currentAccount?.pdsUrl : true),
  });
}
