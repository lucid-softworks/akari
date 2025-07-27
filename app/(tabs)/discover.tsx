import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PostCard } from "@/components/PostCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useFeeds } from "@/hooks/queries/useFeeds";
import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";

export default function DiscoverScreen() {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const userData = jwtStorage.getUserData();

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

  const allPosts = feedData?.pages.flatMap((page: any) => page.feed) || [];

  const renderFeedItem = ({ item }: { item: any }) => (
    <PostCard
      post={{
        id: item.post.uri,
        text: item.post.record?.text || "No text content",
        author: {
          handle: item.post.author.handle,
          displayName: item.post.author.displayName,
        },
        createdAt: new Date(item.post.indexedAt).toLocaleDateString(),
        likeCount: item.post.likeCount || 0,
        commentCount: item.post.replyCount || 0,
        repostCount: item.post.repostCount || 0,
        embed: item.post.embed,
      }}
      onPress={() => {
        router.push(`/post/${encodeURIComponent(item.post.uri)}`);
      }}
    />
  );

  if (feedsLoading) {
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {allFeeds.map((feed) => (
          <TouchableOpacity
            key={feed.uri}
            style={[
              styles.feedTab,
              selectedFeed === feed.uri && styles.feedTabActive,
            ]}
            onPress={() => handleFeedSelection(feed.uri)}
          >
            <ThemedText
              style={[
                styles.feedTabText,
                selectedFeed === feed.uri && styles.feedTabTextActive,
              ]}
            >
              {feed.displayName}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Feed Content */}
      {selectedFeed ? (
        <FlatList
          ref={flatListRef}
          data={allPosts}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item.post.uri}
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
  tabsContainer: {
    maxHeight: 50,
    marginBottom: 8,
    paddingVertical: 4,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  feedTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    marginRight: 6,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  feedTabActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  feedTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6c757d",
    textAlign: "center",
  },
  feedTabTextActive: {
    color: "white",
    fontWeight: "700",
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
