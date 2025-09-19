import { BlueskyApi, type BlueskyTrendingTopicsResponse } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useQuery } from '@tanstack/react-query';

type UseTrendingTopicsOptions = {
  /** Whether the query should be enabled */
  enabled?: boolean;
  /** Number of topics to fetch (default: 10) */
  limit?: number;
};

/**
 * Query hook for fetching curated trending topics from Bluesky.
 * These topics power the search discover surface.
 */
export function useTrendingTopics(limit: number = 10, options: UseTrendingTopicsOptions = {}) {
  const { data: currentAccount } = useCurrentAccount();
  const isEnabled = options.enabled ?? true;

  return useQuery({
    queryKey: ['trendingTopics', limit, currentAccount?.pdsUrl],
    queryFn: async (): Promise<BlueskyTrendingTopicsResponse> => {
      if (!currentAccount?.pdsUrl) {
        throw new Error('No PDS URL available');
      }

      const api = new BlueskyApi(currentAccount.pdsUrl);
      return await api.getTrendingTopics(limit);
    },
    enabled: isEnabled && !!currentAccount?.pdsUrl,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

