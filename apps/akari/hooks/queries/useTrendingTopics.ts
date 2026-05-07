import { useQuery } from '@tanstack/react-query';

import { useAppViewSettings } from '@/hooks/useAppViewSettings';
import { resolveAppView } from '@/utils/appView';
import { apiForPublicAppView } from '@/utils/blueskyApi';

/**
 * Loads the public trending topics list. The `unspecced` namespace only
 * lives on the AppView — user PDSes don't expose it — so we always point
 * the client at the configured AppView's HTTPS base directly (no proxy
 * header) regardless of the signed-in account.
 */
export function useTrendingTopics(limit: number = 12, enabled: boolean = true) {
  const { config } = useAppViewSettings();
  const appViewUrl = resolveAppView(config).url;
  return useQuery({
    queryKey: ['trendingTopics', limit, appViewUrl] as const,
    staleTime: 5 * 60 * 1000,
    enabled,
    queryFn: async () => {
      const api = apiForPublicAppView();
      const res = await api.getTrendingTopics(limit);
      return res.topics;
    },
  });
}
