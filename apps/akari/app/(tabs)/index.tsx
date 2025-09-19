import { useResponsive } from '@/hooks/useResponsive';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BlueskyFeedItem } from '@/bluesky-api';
import { PostCard } from '@/components/PostCard';
import { PostComposer } from '@/components/PostComposer';
import { TabBar } from '@/components/TabBar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useSetSelectedFeed } from '@/hooks/mutations/useSetSelectedFeed';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useFeed } from '@/hooks/queries/useFeed';
import { useFeeds } from '@/hooks/queries/useFeeds';
import { useSavedFeeds } from '@/hooks/queries/usePreferences';
import { useSelectedFeed } from '@/hooks/queries/useSelectedFeed';
import { useTimeline } from '@/hooks/queries/useTimeline';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppTheme, type AppThemeColors } from '@/theme';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { formatRelativeTime } from '@/utils/timeUtils';

export default function HomeScreen() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [showPostComposer, setShowPostComposer] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const { isLargeScreen } = useResponsive();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: currentAccount } = useCurrentAccount();

  // Create scroll to top function
  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Register with the tab scroll registry
  React.useEffect(() => {
    tabScrollRegistry.register('index', scrollToTop);
  }, []);

  // Get user's saved feeds from preferences
  const { data: savedFeeds, isLoading: savedFeedsLoading } = useSavedFeeds();

  // Get user's created feeds
  const { data: feedsData, isLoading: feedsLoading, refetch: refetchFeeds } = useFeeds(currentAccount?.did, 50);

  // Create feeds array from saved preferences
  const allFeeds = savedFeeds
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
      } else if (savedFeed.type === 'feed' && savedFeed.metadata) {
        // Use the actual feed metadata
        return savedFeed.metadata;
      }
      return null;
    })
    .filter((feed): feed is NonNullable<typeof feed> => feed !== null);

  // Add user's created feeds
  const allFeedsWithCreated = [...allFeeds, ...(feedsData?.feeds || [])];

  // Use the custom hook for selected feed management
  const { data: selectedFeed } = useSelectedFeed();
  const setSelectedFeedMutation = useSetSelectedFeed();

  // Handle feed selection with scroll to top
  const handleFeedSelection = (feedUri: string) => {
    setSelectedFeedMutation.mutate(feedUri);
    // Scroll to top when switching feeds
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

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

  const onRefresh = async () => {
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
  };

  const loadMorePosts = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Get posts based on selected feed type
  const allPosts =
    selectedFeed === 'following' ? timelineData?.feed || [] : feedData?.pages.flatMap((page) => page.feed) || [];

  const renderFeedItem = ({ item }: { item: BlueskyFeedItem }) => {
    // Check if this post is a reply and has reply context
    const replyTo = item.post.reply?.parent
      ? {
          author: {
            handle: item.post.reply.parent.author?.handle || 'unknown',
            displayName: item.post.reply.parent.author?.displayName,
          },
          text: item.post.reply.parent.record?.text as string,
        }
      : undefined;

    return (
      <PostCard
        post={{
          id: item.post.uri,
          text: item.post.record?.text as string,
          author: {
            handle: item.post.author.handle,
            displayName: item.post.author.displayName,
            avatar: item.post.author.avatar,
          },
          createdAt: formatRelativeTime(item.post.indexedAt),
          likeCount: item.post.likeCount || 0,
          commentCount: item.post.replyCount || 0,
          repostCount: item.post.repostCount || 0,
          embed: item.post.embed,
          embeds: item.post.embeds,
          labels: item.post.labels,
          viewer: item.post.viewer,
          facets: (item.post.record as any)?.facets,
          replyTo,
          uri: item.post.uri,
          cid: item.post.cid,
        }}
        onPress={() => {
          router.push(`/post/${encodeURIComponent(item.post.uri)}`);
        }}
      />
    );
  };

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
    <ThemedView style={[styles.container, { paddingTop: isLargeScreen ? 0 : insets.top }]}> 
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
      >
        {/* Feed Tabs */}
        <TabBar
          tabs={allFeedsWithCreated.map((feed) => ({
            key: feed.uri,
            label: feed.displayName,
          }))}
          activeTab={selectedFeed || ''}
          onTabChange={handleFeedSelection}
        />

        {/* Feed Content - Full height, no ScrollView */}
        {selectedFeed ? (
          <View style={styles.feedList}>
            {feedLoading || timelineLoading ? (
              <FeedSkeleton count={5} />
            ) : allPosts.length === 0 ? (
              <ThemedView style={styles.emptyState}>
                <ThemedText style={styles.emptyStateText}>{t('feed.noPostsInFeed')}</ThemedText>
              </ThemedView>
            ) : (
              <>
                {allPosts.map((item) => (
                  <View key={`${item.post.uri}-${item.post.indexedAt}`}>{renderFeedItem({ item })}</View>
                ))}
                {isFetchingNextPage && (
                  <ThemedView style={styles.loadingMore}>
                    <ThemedText style={styles.loadingMoreText}>{t('feed.loadingMorePosts')}</ThemedText>
                  </ThemedView>
                )}
              </>
            )}
          </View>
        ) : (
          <ThemedView style={styles.selectFeedPrompt}>
            <ThemedText style={styles.selectFeedText}>{t('feed.selectFeedToView')}</ThemedText>
          </ThemedView>
        )}
      </ScrollView>

      {/* Floating Action Button for creating posts */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 20 }]}
        onPress={() => setShowPostComposer(true)}
        activeOpacity={0.8}
      >
        <IconSymbol name="plus" size={24} color={colors.inverseText} />
      </TouchableOpacity>

      {/* Post Composer Modal */}
      <PostComposer visible={showPostComposer} onClose={() => setShowPostComposer(false)} />
    </ThemedView>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingBottom: 100,
    },
    header: {
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 12,
      paddingHorizontal: 16,
      gap: 4,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderMuted,
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
    feedList: {
      paddingBottom: 100,
      backgroundColor: colors.background,
    },
    feedListContent: {
      paddingBottom: 100,
    },
    loadingMore: {
      alignItems: 'center',
      paddingVertical: 16,
      backgroundColor: colors.surface,
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
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderMuted,
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
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderMuted,
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
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: colors.shadow,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
  });
}
