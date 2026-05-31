import { useCallback, useMemo, useRef, useState } from 'react';

import type { BlueskyFeedItem } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useFeed } from '@/hooks/queries/useFeed';
import { useMastodonHomeTimeline } from '@/hooks/queries/useMastodonHomeTimeline';
import { useMastodonTrendingTimeline } from '@/hooks/queries/useMastodonTrendingTimeline';
import { useMutedWords } from '@/hooks/queries/useMutedWords';
import { useTimeline } from '@/hooks/queries/useTimeline';
import type { useFeedFilters } from '@/hooks/useFeedFilters';
import { MASTODON_HOME_FEED, MASTODON_TRENDING_FEED } from '@/utils/mastodon/feed';
import type { MastodonStatus } from '@/utils/mastodon/types';
import { filterFeedItems } from '@/utils/feedFilters';

export type FeedListItem =
  | { type: 'empty'; state: 'select' | 'loading' | 'empty' }
  | { type: 'post-atproto'; item: BlueskyFeedItem }
  | { type: 'post-mastodon'; status: MastodonStatus };

type FeedFilters = ReturnType<typeof useFeedFilters>['filters'];

/**
 * Owns the home tab's feed data. Calls every data hook unconditionally so
 * hook order stays stable across an account switch — only the one matching
 * the current provider + selected feed does any actual network work; the
 * rest gate themselves via `enabled`.
 *
 * Returns render-ready, protocol-tagged `feedItems`. The home tab's
 * `renderFeedItem` switches on the tag and hands each entry to a
 * protocol-native card so we don't have to reshape Mastodon Status
 * objects into atproto's `BlueskyFeedItem` shape (and accumulate every
 * Mastodon-only feature as an exception on a Bluesky type).
 *
 * For Mastodon the `selectedFeed` carries one of the sentinels from
 * `utils/mastodon/feed.ts` — `mastodon-home` or `mastodon-trending`. The
 * atproto `selectedFeed` keeps its at:// URI or `'following'` value as
 * before. `filters` stays atproto-only.
 */
export function useHomeFeed(
  selectedFeed: string | null | undefined,
  filters: FeedFilters,
  refetchFeeds: () => Promise<unknown> | unknown,
) {
  const [refreshing, setRefreshing] = useState(false);
  const { data: currentAccount } = useCurrentAccount();
  const isMastodon = currentAccount?.provider === 'mastodon';
  const mastodonOnTrending = isMastodon && selectedFeed === MASTODON_TRENDING_FEED;
  const mastodonOnHome = isMastodon && !mastodonOnTrending; // home is the default

  // atproto path — disabled when we're on a Mastodon account. `useFeed`
  // returns immediately when `feedUri` is null; `useTimeline` gates on
  // its `enabled` arg.
  const {
    data: feedData,
    posts: feedPosts,
    isLoading: feedLoading,
    fetchNextPage: fetchNextAtproto,
    hasNextPage: hasNextAtproto,
    isFetchingNextPage: isFetchingNextAtproto,
    refetch: refetchFeed,
  } = useFeed(
    isMastodon || selectedFeed === 'following' ? null : selectedFeed ?? null,
    20,
  );

  const {
    data: timelineData,
    isLoading: timelineLoading,
    refetch: refetchTimeline,
  } = useTimeline(20, !isMastodon && selectedFeed === 'following');

  // Mastodon path — each timeline hook self-gates on `currentAccount.mastodon`
  // (so atproto accounts are no-ops). On top of that we pass `enabled` so
  // only the currently-selected Mastodon feed fires its fetch — switching
  // tabs cancels the other, and atproto users get neither.
  const mastodonHomeQuery = useMastodonHomeTimeline(20);
  const mastodonTrendingQuery = useMastodonTrendingTimeline(20, mastodonOnTrending);
  const mastodonQuery = mastodonOnTrending ? mastodonTrendingQuery : mastodonHomeQuery;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isMastodon) {
      await mastodonQuery.refetch();
    } else if (selectedFeed === 'following') {
      await refetchTimeline();
    } else if (selectedFeed) {
      await refetchFeed();
    } else {
      await refetchFeeds();
    }
    setRefreshing(false);
  }, [isMastodon, mastodonQuery, refetchFeed, refetchFeeds, refetchTimeline, selectedFeed]);

  // FlashList on web fires `onEndReached` repeatedly during initial layout
  // (the rendered cells haven't been measured yet, so it thinks the bottom
  // is in view and re-fires on each pass). Without a gate that ends up
  // chaining `fetchNextPage` calls back-to-back, one cursor advance per
  // layout pass, and you can rack up dozens of getFeed requests on a
  // page the user hasn't even scrolled.
  //
  // Layered gate, all three must hold before pagination is allowed:
  //   1. `hasScrolledRef`: the ScrollView reported a non-trivial offset
  //      from the top. Threshold is high enough to not trip on FlashList's
  //      synthetic mid-layout scroll events.
  //   2. `userInteractedRef`: flipped on `onScrollBeginDrag`, the
  //      explicit "user grabbed the list" signal that synthetic scroll
  //      events don't emit.
  //   3. Time gate: refuse pagination within 1.5s of mount. Belt-and-
  //      braces against either of the above being defeated by FlashList
  //      web's measurement quirks.
  const mountedAtRef = useRef(Date.now());
  const hasScrolledRef = useRef(false);
  const userInteractedRef = useRef(false);

  const handleListScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (event.nativeEvent.contentOffset.y > 256) {
      hasScrolledRef.current = true;
    }
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    userInteractedRef.current = true;
  }, []);

  const loadMorePosts = useCallback(() => {
    if (Date.now() - mountedAtRef.current < 1500) return;
    if (!hasScrolledRef.current && !userInteractedRef.current) return;
    if (isMastodon) {
      if (mastodonQuery.hasNextPage && !mastodonQuery.isFetchingNextPage) {
        void mastodonQuery.fetchNextPage();
      }
      return;
    }
    if (hasNextAtproto && !isFetchingNextAtproto) {
      void fetchNextAtproto();
    }
  }, [fetchNextAtproto, hasNextAtproto, isFetchingNextAtproto, isMastodon, mastodonQuery]);

  // Feed-generator posts come pre-filtered from `useFeed`. The "following"
  // timeline is a separate source (`useTimeline`), so run the same shared
  // filter pass over it here.
  const { data: mutedWords } = useMutedWords();
  const allAtprotoPosts = useMemo(() => {
    if (selectedFeed !== 'following') return feedPosts;
    return filterFeedItems(timelineData?.feed ?? [], filters, mutedWords);
  }, [feedPosts, filters, mutedWords, selectedFeed, timelineData]);

  const mastodonStatuses = useMemo<MastodonStatus[]>(() => {
    return mastodonQuery.data?.pages.flatMap((page) => page.statuses) ?? [];
  }, [mastodonQuery.data]);

  const feedItems = useMemo<FeedListItem[]>(() => {
    if (isMastodon) {
      if (mastodonStatuses.length === 0) {
        const isLoading = mastodonQuery.isLoading || mastodonQuery.isFetchingNextPage;
        return [{ type: 'empty', state: isLoading ? 'loading' : 'empty' }];
      }
      return mastodonStatuses.map((status) => ({ type: 'post-mastodon', status }));
    }

    if (!selectedFeed) {
      return [{ type: 'empty', state: 'select' }];
    }

    if (allAtprotoPosts.length === 0) {
      const hasFetched = selectedFeed === 'following' ? timelineData !== undefined : feedData !== undefined;
      const isLoading = feedLoading || timelineLoading || isFetchingNextAtproto || !hasFetched;
      return [{ type: 'empty', state: isLoading ? 'loading' : 'empty' }];
    }

    return allAtprotoPosts.map((item) => ({ type: 'post-atproto', item }));
  }, [
    allAtprotoPosts,
    feedData,
    feedLoading,
    isFetchingNextAtproto,
    isMastodon,
    mastodonQuery.isFetchingNextPage,
    mastodonQuery.isLoading,
    mastodonStatuses,
    selectedFeed,
    timelineData,
    timelineLoading,
  ]);

  const isFetchingNextPage = isMastodon ? mastodonQuery.isFetchingNextPage : isFetchingNextAtproto;

  // Re-export the sentinels so this hook stays the single source of
  // "what feeds does the home tab know about" for the home tab.
  return {
    feedItems,
    isFetchingNextPage,
    refreshing,
    onRefresh,
    loadMorePosts,
    handleListScroll,
    handleScrollBeginDrag,
    mastodonOnHome,
    mastodonOnTrending,
  };
}

export { MASTODON_HOME_FEED, MASTODON_TRENDING_FEED };
