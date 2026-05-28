import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { BlueskyFeedItem } from '@/bluesky-api';
import { useAcceptLabelerDids } from '@/hooks/queries/useAcceptLabelerDids';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useMutedWords } from '@/hooks/queries/useMutedWords';
import { CursorPageParam } from '@/hooks/queries/types';
import { queryKeys } from '@/hooks/queryKeys';
import { useFeedFilters } from '@/hooks/useFeedFilters';
import { apiForAccount, apiForPublicAppView } from '@/utils/blueskyApi';
import { filterFeedItems } from '@/utils/feedFilters';

// A single upstream getFeed call can return well under `limit` items (a
// feed generator that drops blocked/deleted posts during hydration, etc.),
// which is how you end up staring at two posts. Each query "page" keeps
// pulling the upstream cursor until it has a full batch or the feed ends,
// so the rendered list fills up without driving pagination from an effect.
// Bounded so a sparse feed can't spin.
const MAX_SUBFETCHES_PER_PAGE = 5;

/**
 * Raw infinite query for a feed-generator's posts — no filtering. Each
 * fetched page is topped up to `limit` items by following the upstream
 * cursor, so a short upstream response doesn't leave the screen near-empty.
 * Most screens want {@link useFeed} (this + the filter pass) instead.
 *
 * @param feedUri - The feed URI to fetch posts from
 * @param limit - Target number of posts per page (default: 20)
 */
export function useFeedQuery(feedUri: string | null, limit: number = 20) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const acceptLabelers = useAcceptLabelerDids();

  return useInfiniteQuery({
    queryKey: queryKeys.feed.detail(feedUri, currentAccount?.pdsUrl),
    queryFn: async ({ pageParam }: CursorPageParam) => {
      if (!feedUri) throw new Error('No feed URI provided');

      // Guest path: hit the public AppView directly with no token. The
      // shared API client treats `accessJwt === ''` as "public read"
      // and skips the Authorization header.
      const usePublic = !token || !currentAccount?.pdsUrl;
      const api = usePublic ? apiForPublicAppView() : apiForAccount(currentAccount);
      const auth = usePublic ? '' : token;

      const feed: BlueskyFeedItem[] = [];
      let cursor: string | undefined = pageParam;
      // Top the batch up to `limit` items, following the cursor through
      // any short upstream responses until the feed runs out.
      for (let i = 0; i < MAX_SUBFETCHES_PER_PAGE; i++) {
        const page = await api.getFeed(auth, feedUri, limit, cursor, acceptLabelers);
        feed.push(...page.feed);
        cursor = page.cursor;
        if (!cursor || feed.length >= limit) break;
      }
      return { feed, cursor };
    },
    enabled: !!feedUri,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Cap accumulated pages so a long scrolling session doesn't bloat
    // memory unbounded. On `fetchNextPage` past this limit, RQ drops
    // the oldest page. 25 pages × 20 items = 500-item working set.
    maxPages: 25,
  });
}

/**
 * A feed-generator's posts, ready to render: wraps {@link useFeedQuery} and
 * applies the viewer's muted-word rules + the per-feed filter toggles. The
 * full query is spread through, so callers still drive `fetchNextPage` to
 * pull more from the raw query when filtering thins the list out.
 *
 * Filtering stays a client-side derivation (not baked into the fetch) so
 * toggling a filter or muting a word re-derives instantly instead of
 * forcing a network refetch.
 *
 * @param feedUri - The feed URI; also the key for its filter toggles.
 * @param limit - Target number of posts per page (default: 20)
 */
export function useFeed(feedUri: string | null, limit: number = 20) {
  const query = useFeedQuery(feedUri, limit);
  const { filters } = useFeedFilters(feedUri);
  const { data: mutedWords } = useMutedWords();

  const posts = useMemo<BlueskyFeedItem[]>(() => {
    const raw = query.data?.pages.flatMap((page) => page.feed) ?? [];
    return filterFeedItems(raw, filters, mutedWords);
  }, [query.data, filters, mutedWords]);

  return { ...query, posts };
}
