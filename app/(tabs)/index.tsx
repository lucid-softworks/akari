import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PostCard } from "@/components/PostCard";
import { TabBar } from "@/components/TabBar";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useFeeds } from "@/hooks/queries/useFeeds";
import { useSelectedFeed } from "@/hooks/useSelectedFeed";
import type { BlueskyFeedItem } from "@/utils/blueskyApi";
import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";
import { tabScrollRegistry } from "@/utils/tabScrollRegistry";

export default function DiscoverScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const userData = jwtStorage.getUserData();

  // Create scroll to top function
  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Register with the tab scroll registry
  React.useEffect(() => {
    tabScrollRegistry.register("index", scrollToTop);
  }, []);

  // Get user's feeds
  const {
    data: feedsData,
    isLoading: feedsLoading,
    refetch: refetchFeeds,
  } = useFeeds(userData.did || "", 50, undefined, !!userData.did);

  // Create a combined feeds array with default home feed
  const allFeeds = [
    {
      uri: "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot",
      displayName: "Discover",
      description: "Popular posts from across Bluesky",
      likeCount: 0,
      acceptsInteractions: true,
      contentMode: "app.bsky.feed.defs#contentModeUnspecified" as const,
      indexedAt: new Date().toISOString(),
      creator: {
        did: "did:plc:z72i7hdynmk6r22z27h6tvur",
        handle: "bsky.app",
        displayName: "Bluesky",
        description: "Official Bluesky account",
        avatar: "",
        associated: {
          lists: 0,
          feedgens: 0,
          starterPacks: 0,
          labeler: false,
          chat: { allowIncoming: "all" as const },
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
    },
    ...(feedsData?.feeds || []),
  ];

  // Use the custom hook for selected feed management
  const { selectedFeed, setSelectedFeed, isInitialized } = useSelectedFeed(
    allFeeds[0]?.uri || ""
  );

  // Handle feed selection with scroll to top
  const handleFeedSelection = (feedUri: string) => {
    setSelectedFeed(feedUri);
    // Scroll to top when switching feeds
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Get posts from selected feed with infinite query
  const {
    data: feedData,
    isLoading: feedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchFeed,
  } = useInfiniteQuery({
    queryKey: ["feed", selectedFeed],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      return await blueskyApi.getFeed(token, selectedFeed!, 20, pageParam);
    },
    enabled: !!selectedFeed,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedFeed) {
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

  const allPosts = feedData?.pages.flatMap((page) => page.feed) || [];

  const renderFeedItem = ({ item }: { item: BlueskyFeedItem }) => {
    // Check if this post is a reply and has reply context
    const replyTo = item.post.reply?.parent
      ? {
          author: {
            handle: item.post.reply.parent.author?.handle || "unknown",
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
          createdAt: new Date(item.post.indexedAt).toLocaleDateString(),
          likeCount: item.post.likeCount || 0,
          commentCount: item.post.replyCount || 0,
          repostCount: item.post.repostCount || 0,
          embed: item.post.embed,
          embeds: item.post.embeds,
          labels: item.post.labels,
          replyTo,
        }}
        onPress={() => {
          router.push(`/post/${encodeURIComponent(item.post.uri)}`);
        }}
      />
    );
  };

  if (feedsLoading || !isInitialized) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText style={styles.subtitle}>Loading your feeds...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  if (!feedsData?.feeds || feedsData.feeds.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText style={styles.subtitle}>No custom feeds found</ThemedText>
        </ThemedView>
        <ThemedView style={styles.emptyState}>
          <ThemedText style={styles.emptyStateText}>
            You haven&apos;t created any custom feeds yet.
          </ThemedText>
          <ThemedText style={styles.emptyStateText}>
            You can still browse the default Discover feed.
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Feed Tabs */}
      <TabBar
        tabs={allFeeds.map((feed) => ({
          key: feed.uri,
          label: feed.displayName,
        }))}
        activeTab={selectedFeed || ""}
        onTabChange={handleFeedSelection}
      />

      {/* Feed Content */}
      {selectedFeed && isInitialized ? (
        <FlatList
          ref={flatListRef}
          data={allPosts}
          renderItem={renderFeedItem}
          keyExtractor={(item) => `${item.post.uri}-${item.post.indexedAt}`}
          style={styles.feedList}
          contentContainerStyle={styles.feedListContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ThemedView style={styles.loadingMore}>
                <ThemedText style={styles.loadingMoreText}>
                  Loading more posts...
                </ThemedText>
              </ThemedView>
            ) : null
          }
          ListEmptyComponent={
            feedLoading ? (
              <ThemedView style={styles.emptyState}>
                <ThemedText style={styles.emptyStateText}>
                  Loading posts...
                </ThemedText>
              </ThemedView>
            ) : (
              <ThemedView style={styles.emptyState}>
                <ThemedText style={styles.emptyStateText}>
                  No posts in this feed yet.
                </ThemedText>
              </ThemedView>
            )
          }
        />
      ) : (
        <ThemedView style={styles.selectFeedPrompt}>
          <ThemedText style={styles.selectFeedText}>
            Select a feed to view posts
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    gap: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: "center",
  },
  feedList: {
    flex: 1,
  },
  feedListContent: {
    paddingBottom: 100, // Account for tab bar
  },
  loadingMore: {
    alignItems: "center",
    paddingVertical: 16,
  },
  loadingMoreText: {
    fontSize: 14,
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: "center",
  },
  selectFeedPrompt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  selectFeedText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: "center",
  },
});
