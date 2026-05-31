import { useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { fetchMastodonTrending } from '@/utils/mastodon/trending';

/**
 * Infinite query over the current Mastodon instance's trending statuses.
 *
 * `enabled` flag lets the caller (currently `useHomeFeed`) gate this off
 * when the active Mastodon feed is `'mastodon-home'`, so we don't fetch
 * the trending page if the user is on the home timeline tab — matches
 * the atproto-side `useFeed` / `useTimeline` no-op pattern.
 *
 * Trending pages are stable on a per-instance basis (the server caches
 * its trending computation), so we don't key by accountId — the same
 * trending page is served to every viewer on the instance.
 */
export function useMastodonTrendingTimeline(limit: number = 20, enabled: boolean = true) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const instanceUrl = currentAccount?.mastodon?.instanceUrl;

  return useInfiniteQuery({
    queryKey: queryKeys.mastodonTrendingTimeline.list(instanceUrl, limit),
    queryFn: async ({ pageParam }) => {
      if (!instanceUrl || !token) {
        throw new Error('Mastodon trending: missing instance or token.');
      }
      return await fetchMastodonTrending({
        instanceUrl,
        accessToken: token,
        limit,
        offset: pageParam,
      });
    },
    enabled: enabled && Boolean(instanceUrl && token && currentAccount?.mastodon),
    initialPageParam: 0 as number,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 2 * 60 * 1000,
    maxPages: 25,
  });
}
