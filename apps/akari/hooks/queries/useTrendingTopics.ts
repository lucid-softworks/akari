import { BlueskyApi } from '@/bluesky-api';
import { useQuery } from '@tanstack/react-query';

/**
 * Query hook for fetching trending topics surfaced by Bluesky
 * @param limit - Number of topics to fetch (default: 10)
 */
export function useTrendingTopics(limit: number = 10) {
  return useQuery({
    queryKey: ['trendingTopics', limit],
    queryFn: async () => {
      const api = new BlueskyApi('https://public.api.bsky.app');
      return await api.getTrendingTopics(limit);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
