import { fontSize, layout, opacity, spacing } from '@/constants/tokens';
import { useResponsive } from '@/hooks/useResponsive';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BlueskyFeedItem } from '@/bluesky-api';
import { FeedFiltersSheet } from '@/components/FeedFiltersSheet';
import { PostComposer } from '@/components/PostComposer';
import { ReviewComposer } from '@/components/ReviewComposer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedListEmpty } from '@/components/home/FeedListEmpty';
import { FeedListHeader } from '@/components/home/FeedListHeader';
import { FeedPostCard } from '@/components/home/FeedPostCard';
import { HomeFab } from '@/components/home/HomeFab';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { useSetSelectedFeed } from '@/hooks/mutations/useSetSelectedFeed';
import { useFeed } from '@/hooks/queries/useFeed';
import { useMutedWords } from '@/hooks/queries/useMutedWords';
import { useSelectedFeed } from '@/hooks/queries/useSelectedFeed';
import { useTimeline } from '@/hooks/queries/useTimeline';
import { useFeedFilters } from '@/hooks/useFeedFilters';
import { useSavedFeedsList } from '@/hooks/useSavedFeedsList';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { shouldHideFeedItem } from '@/utils/feedFilters';
import { isPostMuted } from '@/utils/mutedWordsFilter';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

type FeedListItem = { type: 'empty'; state: 'select' | 'loading' | 'empty' } | { type: 'post'; item: BlueskyFeedItem };

export default function HomeScreen() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [showReviewComposer, setShowReviewComposer] = useState(false);
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  const filterIconColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const feedListRef = useRef<VirtualizedListHandle<FeedListItem>>(null);
  const insets = useSafeAreaInsets();
  const { isLargeScreen } = useResponsive();

  // Create scroll to top function
  const scrollToTop = useCallback(() => {
    feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Register with the tab scroll registry
  React.useEffect(() => {
    tabScrollRegistry.register('index', scrollToTop);
  }, [scrollToTop]);

  const { allFeedsWithCreated, savedFeedsLoading, feedsLoading, refetchFeeds } = useSavedFeedsList();

  // Use the custom hook for selected feed management
  const { data: selectedFeed } = useSelectedFeed();
  const setSelectedFeedMutation = useSetSelectedFeed();

  const { filters, anyFilterActive } = useFeedFilters(selectedFeed ?? null);

  // Handle feed selection with scroll to top
  const handleFeedSelection = useCallback(
    (feedUri: string) => {
      setSelectedFeedMutation.mutate(feedUri);
      scrollToTop();
    },
    [scrollToTop, setSelectedFeedMutation],
  );

  // Get posts from selected feed
  const {
    data: feedData,
    isLoading: feedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchFeed,
  } = useFeed(selectedFeed === 'following' ? null : selectedFeed, 20);

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

  // Get posts based on selected feed type, filtering out anything that
  // matches a muted-word rule or a global feed-filter toggle.
  const { data: mutedWords } = useMutedWords();
  const allPosts = useMemo(() => {
    const raw =
      selectedFeed === 'following'
        ? (timelineData?.feed ?? [])
        : (feedData?.pages.flatMap((page) => page.feed) ?? []);
    return raw.filter((entry) => {
      if (mutedWords.length && isPostMuted(entry.post, mutedWords)) return false;
      if (shouldHideFeedItem(entry, filters)) return false;
      return true;
    });
  }, [feedData, filters, mutedWords, selectedFeed, timelineData]);

  const feedItems = useMemo<FeedListItem[]>(() => {
    if (!selectedFeed) {
      return [{ type: 'empty', state: 'select' }];
    }

    if (allPosts.length === 0) {
      const hasFetched = selectedFeed === 'following' ? timelineData !== undefined : feedData !== undefined;
      const isLoading = feedLoading || timelineLoading || !hasFetched;
      return [{ type: 'empty', state: isLoading ? 'loading' : 'empty' }];
    }

    return allPosts.map((item) => ({ type: 'post', item }));
  }, [allPosts, feedData, feedLoading, selectedFeed, timelineData, timelineLoading]);

  const feedTabs = useMemo(
    () =>
      allFeedsWithCreated.map((feed) => ({
        key: feed.uri,
        label: feed.displayName,
      })),
    [allFeedsWithCreated],
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: FeedListItem }) => {
      if (item.type === 'empty') {
        return <FeedListEmpty state={item.state} />;
      }
      return <FeedPostCard entry={item.item} selectedFeed={selectedFeed ?? undefined} />;
    },
    [selectedFeed],
  );

  const keyExtractor = useCallback((item: FeedListItem) => {
    if (item.type === 'empty') {
      return `feed-empty-${item.state}`;
    }

    return `${item.item.post.cid ?? 'unknown'}-${item.item.post.uri}`;
  }, []);

  const listFooterComponent = isFetchingNextPage ? (
    <ThemedView style={styles.loadingMore}>
      <ThemedText style={styles.loadingMoreText}>{t('feed.loadingMorePosts')}</ThemedText>
    </ThemedView>
  ) : null;

  if (savedFeedsLoading || feedsLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText style={styles.subtitle}>{t('feed.loadingFeeds')}</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FeedListHeader
        isLargeScreen={isLargeScreen}
        insetTop={insets.top}
        feedTabs={feedTabs}
        selectedFeed={selectedFeed ?? undefined}
        anyFilterActive={anyFilterActive}
        filterIconColor={filterIconColor}
        onTabChange={handleFeedSelection}
        onShowFilters={() => setShowFiltersSheet(true)}
      />
      <VirtualizedList
        ref={feedListRef}
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={320}
        overscan={3}
        ListFooterComponent={listFooterComponent ?? undefined}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.4}
        onScroll={handleListScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        scrollEventThrottle={250}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      />

      <HomeFab
        onPostPress={() => setShowPostComposer(true)}
        onReviewPress={() => setShowReviewComposer(true)}
      />

      <PostComposer visible={showPostComposer} onClose={() => setShowPostComposer(false)} />
      <ReviewComposer visible={showReviewComposer} onClose={() => setShowReviewComposer(false)} />
      <FeedFiltersSheet
        visible={showFiltersSheet}
        onClose={() => setShowFiltersSheet(false)}
        feedKey={selectedFeed ?? null}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: layout.tabBarPadding,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
    textAlign: 'center',
  },
  loadingMore: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  loadingMoreText: {
    fontSize: fontSize.base,
    opacity: opacity.tertiary,
  },
});
