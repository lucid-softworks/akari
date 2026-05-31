import { useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { fetchMastodonHomeTimeline } from '@/utils/mastodon/timeline';

/**
 * Infinite query over the current Mastodon account's home timeline.
 *
 * Enabled only when the active account is a Mastodon account — atproto
 * accounts fall through to {@link useTimeline} / {@link useFeed} via the
 * provider branch in {@link useHomeFeed}.
 *
 * Pagination cursor is the oldest status id on the previous page (Mastodon's
 * `max_id` convention). `nextMaxId === undefined` ends the feed.
 */
export function useMastodonHomeTimeline(limit: number = 20) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const instanceUrl = currentAccount?.mastodon?.instanceUrl;
  const accountId = currentAccount?.mastodon?.accountId;

  return useInfiniteQuery({
    queryKey: queryKeys.mastodonHomeTimeline.list(instanceUrl, accountId, limit),
    queryFn: async ({ pageParam }) => {
      if (!instanceUrl || !token) {
        throw new Error('Mastodon home timeline: missing instance or token.');
      }
      return await fetchMastodonHomeTimeline({
        instanceUrl,
        accessToken: token,
        limit,
        maxId: pageParam,
      });
    },
    enabled: Boolean(instanceUrl && token && currentAccount?.mastodon),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextMaxId,
    staleTime: 2 * 60 * 1000,
    maxPages: 25,
  });
}
