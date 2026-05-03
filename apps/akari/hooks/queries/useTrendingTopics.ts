import { useQuery } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';

/**
 * Loads the public trending topics list. The `unspecced` namespace only
 * lives on the appview — user PDSes don't expose it — so we always
 * point the client at api.bsky.app regardless of the signed-in account.
 */
export function useTrendingTopics(limit: number = 12, enabled: boolean = true) {
  return useQuery({
    queryKey: ['trendingTopics', limit] as const,
    staleTime: 5 * 60 * 1000,
    enabled,
    queryFn: async () => {
      const api = new BlueskyApi('https://api.bsky.app');
      const res = await api.getTrendingTopics(limit);
      return res.topics;
    },
  });
}
