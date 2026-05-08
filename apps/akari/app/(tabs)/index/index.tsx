import { spacing, radius, fontSize, fontWeight, opacity, shadows, layout, semanticColors, activeOpacity } from '@/constants/tokens';
import { useResponsive } from '@/hooks/useResponsive';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BlueskyFeedItem } from '@/bluesky-api';
import { FeedFiltersSheet } from '@/components/FeedFiltersSheet';
import { PostCard } from '@/components/PostCard';
import { PostComposer } from '@/components/PostComposer';
import { ReviewComposer } from '@/components/ReviewComposer';
import { TabBar } from '@/components/TabBar';
import { TrendingBar } from '@/components/TrendingBar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { useSetSelectedFeed } from '@/hooks/mutations/useSetSelectedFeed';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useFeed } from '@/hooks/queries/useFeed';
import { useFeeds } from '@/hooks/queries/useFeeds';
import { useSavedFeeds } from '@/hooks/queries/usePreferences';
import { useMutedWords } from '@/hooks/queries/useMutedWords';
import { useSelectedFeed } from '@/hooks/queries/useSelectedFeed';
import { useTimeline } from '@/hooks/queries/useTimeline';
import { useFeedFilters } from '@/hooks/useFeedFilters';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { shouldHideFeedItem } from '@/utils/feedFilters';
import { isPostMuted } from '@/utils/mutedWordsFilter';
import { useNavigateToPost } from '@/utils/navigation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { formatRelativeTime } from '@/utils/timeUtils';

type FeedListItem = { type: 'empty'; state: 'select' | 'loading' | 'empty' } | { type: 'post'; item: BlueskyFeedItem };

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigateToPost = useNavigateToPost();
  const [refreshing, setRefreshing] = useState(false);
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [showReviewComposer, setShowReviewComposer] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  const filterIconColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const feedListRef = useRef<VirtualizedListHandle<FeedListItem>>(null);
  const insets = useSafeAreaInsets();
  const { isLargeScreen } = useResponsive();


  const { data: currentAccount } = useCurrentAccount();

  // Create scroll to top function
  const scrollToTop = useCallback(() => {
    feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Register with the tab scroll registry
  React.useEffect(() => {
    tabScrollRegistry.register('index', scrollToTop);
  }, [scrollToTop]);

  // Get user's saved feeds from preferences
  const { data: savedFeeds, isLoading: savedFeedsLoading } = useSavedFeeds();

  // Get user's created feeds
  const { data: feedsData, isLoading: feedsLoading, refetch: refetchFeeds } = useFeeds(currentAccount?.did, 50);

  // Create feeds array from saved preferences
  const allFeeds = useMemo(() => {
    return (savedFeeds ?? [])
      .map((savedFeed) => {
        if (savedFeed.type === 'timeline' && savedFeed.value === 'following') {
          // Create timeline feed object for "Following"
          return {
            uri: 'following',
            displayName: 'Following',
            description: 'Posts from people you follow',
            likeCount: 0,
            acceptsInteractions: true,
            contentMode: 'app.bsky.feed.defs#contentModeUnspecified' as const,
            indexedAt: new Date().toISOString(),
            creator: {
              did: currentAccount?.did || '',
              handle: currentAccount?.handle || '',
              displayName: 'You',
              description: 'Your timeline',
              avatar: '',
              associated: {
                lists: 0,
                feedgens: 0,
                starterPacks: 0,
                labeler: false,
                chat: { allowIncoming: 'all' as const },
              },
              indexedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              viewer: {
                muted: false,
                blockedBy: false,
              },
              labels: [],
            },
            labels: [],
          };
        }

        if (savedFeed.type === 'feed' && savedFeed.metadata) {
          // Use the actual feed metadata
          return savedFeed.metadata;
        }

        return null;
      })
      .filter((feed): feed is NonNullable<typeof feed> => feed !== null);
  }, [currentAccount?.did, currentAccount?.handle, savedFeeds]);

  // Add user's created feeds
  const allFeedsWithCreated = useMemo(() => {
    return [...allFeeds, ...(feedsData?.feeds ?? [])];
  }, [allFeeds, feedsData]);

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
  // chaining `fetchNextPage` calls back-to-back — one cursor advance per
  // layout pass — and you can rack up dozens of getFeed requests on a
  // page the user hasn't even scrolled.
  //
  // Layered gate, all three must hold before pagination is allowed:
  //   1. `hasScrolledRef` — the ScrollView reported a non-trivial offset
  //      from the top. Threshold is high enough to not trip on FlashList's
  //      synthetic mid-layout scroll events.
  //   2. `userInteractedRef` — flipped on `onScrollBeginDrag`, the
  //      explicit "user grabbed the list" signal that synthetic scroll
  //      events don't emit.
  //   3. Time gate — refuse pagination within 1.5s of mount. Belt-and-
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
  const listHeaderComponent = useCallback(
    () => (
      <ThemedView
        style={[
          styles.listHeaderContainer,
          {
            paddingTop: isLargeScreen ? insets.top : 0,
            paddingBottom: isLargeScreen ? spacing.md : 0,
          },
        ]}
      >
        <ThemedView style={styles.listHeaderContent}>
          <ThemedView style={styles.feedRow}>
            <ThemedView style={styles.tabBarSlot}>
              <TabBar tabs={feedTabs} activeTab={selectedFeed || ''} onTabChange={handleFeedSelection} />
            </ThemedView>
            <Pressable
              style={({ pressed }) => [styles.filterButton, pressed && { opacity: activeOpacity.default }]}
              onPress={() => setShowFiltersSheet(true)}
              accessibilityRole="button"
              accessibilityLabel={t('feed.filters')}
              
              disabled={!selectedFeed}
            >
              <IconSymbol
                name="line.3.horizontal.decrease.circle"
                size={fontSize.xxl}
                color={anyFilterActive ? semanticColors.systemBlue : filterIconColor}
              />
            </Pressable>
          </ThemedView>
          <TrendingBar />
        </ThemedView>
      </ThemedView>
    ),
    [
      anyFilterActive,
      feedTabs,
      filterIconColor,
      handleFeedSelection,
      insets.top,
      isLargeScreen,
      selectedFeed,
      t,
    ],
  );
  const renderFeedItem = useCallback(
    ({ item }: { item: FeedListItem }) => {
      if (item.type === 'empty') {
        if (item.state === 'loading') {
          return <FeedSkeleton count={5} />;
        }

        if (item.state === 'select') {
          return (
            <ThemedView style={styles.selectFeedPrompt}>
              <ThemedText style={styles.selectFeedText}>{t('feed.selectFeedToView')}</ThemedText>
            </ThemedView>
          );
        }

        return (
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>{t('feed.noPostsInFeed')}</ThemedText>
          </ThemedView>
        );
      }

      const post = item.item.post;
      const replyTo = post.reply?.parent
        ? {
            author: {
              handle: post.reply.parent.author?.handle || 'unknown',
              displayName: post.reply.parent.author?.displayName,
            },
            text: post.reply.parent.record?.text as string,
          }
        : undefined;

      return (
        <PostCard
          feedUri={selectedFeed ?? undefined}
          post={{
            id: post.uri,
            text: post.record?.text as string,
            author: {
              did: post.author.did,
              handle: post.author.handle,
              displayName: post.author.displayName,
              avatar: post.author.avatar,
              verification: post.author.verification,
            },
            createdAt: formatRelativeTime(post.indexedAt),
            likeCount: post.likeCount || 0,
            commentCount: post.replyCount || 0,
            repostCount: post.repostCount || 0,
            embed: post.embed,
            embeds: post.embeds,
            labels: post.labels,
            viewer: post.viewer,
            facets: (post.record as any)?.facets,
            replyTo,
            uri: post.uri,
            cid: post.cid,
            feedContext: item.item.feedContext,
            threadRootUri: (post.record as { reply?: { root?: { uri?: string } } }).reply?.root?.uri,
          }}
          href={`/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`}
          onPress={() => {
            const uriParts = post.uri.split('/');
            const rKey = uriParts[uriParts.length - 1];
            navigateToPost({ actor: post.author.handle, rKey });
          }}
        />
      );
    },
    [t, navigateToPost, selectedFeed],
  );

  const keyExtractor = useCallback((item: FeedListItem) => {
    if (item.type === 'empty') {
      return `feed-empty-${item.state}`;
    }

    return `${item.item.post.cid ?? 'unknown'}-${item.item.post.uri}`;
  }, []);

  const listFooterComponent = useMemo(() => {
    if (!isFetchingNextPage) {
      return null;
    }

    return (
      <ThemedView style={styles.loadingMore}>
        <ThemedText style={styles.loadingMoreText}>{t('feed.loadingMorePosts')}</ThemedText>
      </ThemedView>
    );
  }, [isFetchingNextPage, t]);

  if (savedFeedsLoading || feedsLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText style={styles.subtitle}>{t('feed.loadingFeeds')}</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  // Always show the feed selector with at least the default Discover feed
  // The allFeeds array already includes the default feed, so we don't need to return early

  return (
    <ThemedView style={styles.container}>
      <VirtualizedList
        ref={feedListRef}
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={320}
        overscan={3}
        ListHeaderComponent={listHeaderComponent}
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

      {/* FAB Menu */}
      {showFabMenu && (
        <Pressable style={({ pressed }) => [styles.fabOverlay, pressed && { opacity: 1 }]}  onPress={() => setShowFabMenu(false)}>
          <View style={[styles.fabMenu, { bottom: 90 }]}>
            <Pressable
              style={({ pressed }) => [styles.fabMenuItem, pressed && { opacity: activeOpacity.default }]}
              
              onPress={() => { setShowFabMenu(false); setShowPostComposer(true); }}
            >
              <IconSymbol name="square.and.pencil" size={18} color="white" />
              <ThemedText style={styles.fabMenuText}>Post</ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.fabMenuItem, pressed && { opacity: activeOpacity.default }]}
              
              onPress={() => { setShowFabMenu(false); setShowReviewComposer(true); }}
            >
              <IconSymbol name="star.fill" size={18} color="white" />
              <ThemedText style={styles.fabMenuText}>Review</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, { bottom: 20 }, pressed && { opacity: activeOpacity.subtle }]}
        onPress={() => setShowFabMenu((prev) => !prev)}
        
      >
        <IconSymbol name="plus" size={24} color="white" />
      </Pressable>

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
    paddingBottom: layout.tabBarPadding, // Account for tab bar
  },
  listHeaderContainer: {},
  listHeaderContent: {
    width: '100%',
    alignSelf: 'stretch',
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBarSlot: {
    flex: 1,
    minWidth: 0,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxxl,
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary,
    textAlign: 'center',
  },
  selectFeedPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxxl,
  },
  selectFeedText: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: semanticColors.systemBlue,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  fabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fabMenu: {
    position: 'absolute',
    right: spacing.xl,
    gap: spacing.sm,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: semanticColors.systemBlue,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    ...shadows.md,
  },
  fabMenuText: {
    color: '#fff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
