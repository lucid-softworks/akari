import { BlueskyApi, type BlueskyFeed } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useQuery } from '@tanstack/react-query';

/**
 * Query hook for fetching feed generator metadata
 * @param feedUris - Array of feed URIs to get metadata for
 */
export function useFeedGenerators(feedUris: string[]) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ['feedGenerators', feedUris, currentAccount?.pdsUrl],
    queryFn: async (): Promise<{ feeds: BlueskyFeed[] }> => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (feedUris.length === 0) return { feeds: [] };

      const api = new BlueskyApi(currentAccount.pdsUrl);
      return await api.getFeedGenerators(token, feedUris);
    },
    enabled: !!token && !!currentAccount?.pdsUrl && feedUris.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
