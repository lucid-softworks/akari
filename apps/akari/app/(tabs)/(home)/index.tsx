import { useResponsive } from '@/hooks/useResponsive';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BlueskyFeedItem } from '@/bluesky-api';
import { PostCard } from '@/components/PostCard';
import { PostComposer } from '@/components/PostComposer';
import { TabBar } from '@/components/TabBar';
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
import { useSelectedFeed } from '@/hooks/queries/useSelectedFeed';
import { useTimeline } from '@/hooks/queries/useTimeline';
import { useTranslation } from '@/hooks/useTranslation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { formatRelativeTime } from '@/utils/timeUtils';

type FeedListItem =
  | { type: 'empty'; state: 'select' | 'loading' | 'empty' }
  | { type: 'post'; item: BlueskyFeedItem };

export default function HomeScreen() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [showPostComposer, setShowPostComposer] = useState(false);
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
    tabScrollRegistry.register('home', scrollToTop);
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
  const { data: timelineData, isLoading: timelineLoading } = useTimeline(20, selectedFeed === 'following');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selectedFeed === 'following') {
      // Refresh timeline for following feed
      // Note: useTimeline doesn't have a refetch method, so we'll skip this for now
    } else if (selectedFeed) {
      await refetchFeed();
    } else {
      await refetchFeeds();
    }
    setRefreshing(false);
  }, [refetchFeed, refetchFeeds, selectedFeed]);

  const loadMorePosts = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Get posts based on selected feed type
  const allPosts = useMemo(() => {
    if (selectedFeed === 'following') {
      return timelineData?.feed ?? [];
    }

    return feedData?.pages.flatMap((page) => page.feed) ?? [];
  }, [feedData, selectedFeed, timelineData]);

  const feedItems = useMemo<FeedListItem[]>(() => {
    if (!selectedFeed) {
      return [{ type: 'empty', state: 'select' }];
    }

    if (allPosts.length === 0) {
      return [{ type: 'empty', state: feedLoading || timelineLoading ? 'loading' : 'empty' }];
    }

    return allPosts.map((item) => ({ type: 'post', item }));
  }, [allPosts, feedLoading, selectedFeed, timelineLoading]);
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
          { paddingTop: isLargeScreen ? 0 : insets.top },
        ]}
      >
        <ThemedView style={styles.listHeaderContent}>
          <TabBar tabs={feedTabs} activeTab={selectedFeed || ''} onTabChange={handleFeedSelection} />
        </ThemedView>
      </ThemedView>
    ),
    [feedTabs, handleFeedSelection, insets.top, isLargeScreen, selectedFeed],
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
          post={{
            id: post.uri,
            text: post.record?.text as string,
            author: {
              did: post.author.did,
              handle: post.author.handle,
              displayName: post.author.displayName,
              avatar: post.author.avatar,
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
          }}
          onPress={() => {
            router.push(`/post/${encodeURIComponent(post.uri)}`);
          }}
        />
      );
    },
    [t],
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
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      />

      {/* Floating Action Button for creating posts */}
      <TouchableOpacity style={[styles.fab, { bottom: 20 }]} onPress={() => setShowPostComposer(true)} activeOpacity={0.8}>
        <IconSymbol name="plus" size={24} color="white" />
      </TouchableOpacity>

      {/* Post Composer Modal */}
      <PostComposer visible={showPostComposer} onClose={() => setShowPostComposer(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100, // Account for tab bar
  },
  listHeaderContainer: {
    paddingBottom: 12,
  },
  listHeaderContent: {
    width: '100%',
    alignSelf: 'stretch',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    gap: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
  },
  loadingMore: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    fontSize: 14,
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
  },
  selectFeedPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  selectFeedText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
