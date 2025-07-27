import { router } from "expo-router";
import { useEffect } from "react";
import { FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuthStatus } from "@/hooks/queries/useAuthStatus";
import { useConversations } from "@/hooks/queries/useConversations";
import { useBorderColor } from "@/hooks/useBorderColor";
import { Image } from "expo-image";

type Conversation = {
  id: string;
  handle: string;
  displayName: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  status: "request" | "accepted";
  muted: boolean;
};

type ConversationError = {
  type: "permission" | "network" | "unknown";
  message: string;
};

export default function MessagesScreen() {
  const { data: authData, isLoading } = useAuthStatus();
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();

  const {
    data: conversationsData,
    isLoading: conversationsLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversations();

  // Handle navigation in useEffect to avoid React warnings
  useEffect(() => {
    if (!isLoading && !authData?.isAuthenticated) {
      router.replace("/(auth)/signin");
    }
  }, [authData?.isAuthenticated, isLoading]);

  // Don't render anything if not authenticated or still loading
  if (isLoading || !authData?.isAuthenticated) {
    return null;
  }

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { borderBottomColor: borderColor }]}
      onPress={() => {
        // Navigate to conversation detail within the messages tab
        router.push(`/(tabs)/messages/${encodeURIComponent(item.handle)}`);
      }}
    >
      <ThemedView style={styles.conversationContent}>
        <ThemedView style={styles.avatarContainer}>
          {item.avatar ? (
            <ThemedView style={styles.avatar}>
              <Image
                source={{ uri: item.avatar }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            </ThemedView>
          ) : (
            <ThemedView style={styles.avatar}>
              <ThemedText style={styles.avatarFallback}>
                {item.displayName[0].toUpperCase()}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        <ThemedView style={styles.conversationInfo}>
          <ThemedView style={styles.conversationHeader}>
            <ThemedText style={styles.displayName}>
              {item.displayName}
            </ThemedText>
            <ThemedText style={styles.timestamp}>{item.timestamp}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.conversationFooter}>
            <ThemedText style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage}
            </ThemedText>
            {item.unreadCount > 0 && (
              <ThemedView style={styles.unreadBadge}>
                <ThemedText style={styles.unreadCount}>
                  {item.unreadCount}
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
          {item.status === "request" && (
            <ThemedView style={styles.statusBadge}>
              <ThemedText style={styles.statusText}>Pending</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;

    return (
      <ThemedView style={styles.loadingFooter}>
        <ThemedText style={styles.loadingText}>Loading more...</ThemedText>
      </ThemedView>
    );
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (conversationsLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedView style={styles.header}>
          <ThemedText style={styles.title}>Messages</ThemedText>
        </ThemedView>
        <ThemedView style={styles.loadingState}>
          <ThemedText style={styles.loadingText}>
            Loading conversations...
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  if (error) {
    const conversationError = error as ConversationError;

    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedView style={styles.header}>
          <ThemedText style={styles.title}>Messages</ThemedText>
        </ThemedView>
        <ThemedView style={styles.errorState}>
          {conversationError.type === "permission" ? (
            <>
              <ThemedText style={styles.errorTitle}>
                Messages Not Available
              </ThemedText>
              <ThemedText style={styles.errorSubtitle}>
                {conversationError.message}
              </ThemedText>
              <ThemedText style={styles.errorHelp}>
                To access messages, you need to create an app password with chat
                permissions in your Bluesky settings.
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText style={styles.errorTitle}>
                Error loading conversations
              </ThemedText>
              <ThemedText style={styles.errorSubtitle}>
                {conversationError.message}
              </ThemedText>
            </>
          )}
        </ThemedView>
      </ThemedView>
    );
  }

  // Flatten all pages of conversations into a single array
  const conversations =
    conversationsData?.pages.flatMap((page) => page.conversations) || [];

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Messages</ThemedText>
      </ThemedView>

      {conversations.length > 0 ? (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.conversationsContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      ) : (
        <ThemedView style={styles.emptyState}>
          <ThemedText style={styles.emptyTitle}>No messages yet</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Start a conversation by following someone and sending them a message
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  list: {
    flex: 1,
  },
  conversationsContent: {
    paddingBottom: 100, // Add extra padding to account for tab bar
  },
  conversationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  conversationContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  conversationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    opacity: 0.7,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
  },
  statusBadge: {
    backgroundColor: "#FF9500",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.6,
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: "center",
    marginBottom: 16,
  },
  errorHelp: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: "center",
  },
});
