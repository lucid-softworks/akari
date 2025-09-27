import { useQuery } from '@tanstack/react-query';

import { BlueskyApi, type BlueskyTrendingTopic } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';

const PUBLIC_APPVIEW_URL = 'https://public.api.bsky.app';

/**
 * Query hook that loads curated trending topics from Bluesky.
 * @param limit - Maximum number of topics to request (default: 10)
 */
export function useTrendingTopics(limit: number = 10) {
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ['trendingTopics', limit, currentAccount?.pdsUrl],
    queryFn: async (): Promise<BlueskyTrendingTopic[]> => {
      const baseUrl = currentAccount?.pdsUrl ?? PUBLIC_APPVIEW_URL;
      const api = new BlueskyApi(baseUrl);

      try {
        const response = await api.getTrendingTopics(limit);
        return response.topics ?? [];
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to load trending topics', error);
        }
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

