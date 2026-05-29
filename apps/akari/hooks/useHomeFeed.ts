import { useCallback, useMemo, useRef, useState } from 'react';

import type { BlueskyFeedItem } from '@/bluesky-api';
import { useFeed } from '@/hooks/queries/useFeed';
import { useMutedWords } from '@/hooks/queries/useMutedWords';
import { useTimeline } from '@/hooks/queries/useTimeline';
import type { useFeedFilters } from '@/hooks/useFeedFilters';
import { filterFeedItems } from '@/utils/feedFilters';

export type FeedListItem =
  | { type: 'empty'; state: 'select' | 'loading' | 'empty' }
  | { type: 'post'; item: BlueskyFeedItem };

type FeedFilters = ReturnType<typeof useFeedFilters>['filters'];

/**
 * Owns the home tab's feed data: the feed-generator and following
 * timeline queries, the shared filter pass, the render-ready
 * `feedItems` list, refresh, and the layered pagination gate that keeps
 * FlashList web from chain-firing `fetchNextPage` during initial layout.
 */
export function useHomeFeed(
  selectedFeed: string | null | undefined,
  filters: FeedFilters,
  refetchFeeds: () => Promise<unknown> | unknown,
) {
  const [refreshing, setRefreshing] = useState(false);

  // `useFeed` fetches (topping short pages up to a full batch) and applies
  // the muted-word + per-feed filters, so `feedPosts` is render-ready.
  const {
    data: feedData,
    posts: feedPosts,
    isLoading: feedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchFeed,
  } = useFeed(selectedFeed === 'following' ? null : selectedFeed ?? null, 20);

  // Get timeline data for "following" feed
  const {
    data: timelineData,
    isLoading: timelineLoading,
    refetch: refetchTimeline,
  } = useTimeline(20, selectedFeed === 'following');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selectedFeed === 'following') {
      await refetchTimeline();
    } else if (selectedFeed) {
      await refetchFeed();
    } else {
      await refetchFeeds();
    }
    setRefreshing(false);
  }, [refetchFeed, refetchFeeds, refetchTimeline, selectedFeed]);

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
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Feed-generator posts come pre-filtered from `useFeed`. The "following"
  // timeline is a separate source (`useTimeline`), so run the same shared
  // filter pass over it here.
  const { data: mutedWords } = useMutedWords();
  const allPosts = useMemo(() => {
    if (selectedFeed !== 'following') return feedPosts;
    return filterFeedItems(timelineData?.feed ?? [], filters, mutedWords);
  }, [feedPosts, filters, mutedWords, selectedFeed, timelineData]);

  const feedItems = useMemo<FeedListItem[]>(() => {
    if (!selectedFeed) {
      return [{ type: 'empty', state: 'select' }];
    }

    if (allPosts.length === 0) {
      const hasFetched = selectedFeed === 'following' ? timelineData !== undefined : feedData !== undefined;
      const isLoading = feedLoading || timelineLoading || isFetchingNextPage || !hasFetched;
      return [{ type: 'empty', state: isLoading ? 'loading' : 'empty' }];
    }

    return allPosts.map((item) => ({ type: 'post', item }));
  }, [allPosts, feedData, feedLoading, isFetchingNextPage, selectedFeed, timelineData, timelineLoading]);

  return {
    feedItems,
    isFetchingNextPage,
    refreshing,
    onRefresh,
    loadMorePosts,
    handleListScroll,
    handleScrollBeginDrag,
  };
}
