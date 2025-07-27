import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useNotifications } from "@/hooks/queries/useNotifications";
import { useColorScheme } from "@/hooks/useColorScheme";

/**
 * Grouped notification type
 */
type GroupedNotification = {
  id: string;
  type: "like" | "repost" | "follow" | "reply" | "mention" | "quote";
  subject?: string; // Post URI for post-related notifications
  postContent?: string; // Content of the post being interacted with
  authors: {
    did: string;
    handle: string;
    displayName: string;
    avatar: string;
  }[];
  isRead: boolean;
  latestTimestamp: string;
  count: number;
};

/**
 * Notification item component
 */
type NotificationItemProps = {
  notification: GroupedNotification;
  onPress: () => void;
};

function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const getReasonText = (type: string, count: number) => {
    const action = (() => {
      switch (type) {
        case "like":
          return "liked your post";
        case "repost":
          return "reposted your post";
        case "follow":
          return "started following you";
        case "reply":
          return "replied to your post";
        case "mention":
          return "mentioned you";
        case "quote":
          return "quoted your post";
        default:
          return type;
      }
    })();

    if (count === 1) {
      return action;
    } else if (count === 2) {
      return `and 1 other ${action}`;
    } else {
      return `and ${count - 1} others ${action}`;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d`;
    }
  };

  const renderAvatars = () => {
    const maxAvatars = 3;
    const avatarsToShow = notification.authors.slice(0, maxAvatars);
    const remainingCount = notification.authors.length - maxAvatars;

    return (
      <View style={styles.avatarsContainer}>
        {avatarsToShow.map((author, index) => (
          <View
            key={author.did}
            style={[
              styles.avatarWrapper,
              {
                marginLeft: index > 0 ? -8 : 0,
                zIndex: maxAvatars - index,
              },
            ]}
          >
            {author.avatar ? (
              <Image
                source={{ uri: author.avatar }}
                style={styles.avatar}
                contentFit="cover"
                placeholder={require("@/assets/images/partial-react-logo.png")}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>
                  {(author.displayName || author.handle)[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        ))}
        {remainingCount > 0 && (
          <View
            style={[
              styles.avatarWrapper,
              {
                marginLeft: -8,
                zIndex: 0,
              },
            ]}
          >
            <View style={[styles.avatar, styles.avatarOverflow]}>
              <Text style={styles.avatarOverflowText}>+{remainingCount}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: notification.isRead
            ? colors.background
            : colors.tint + "10",
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.notificationContent}>
        {renderAvatars()}
        <View style={styles.notificationText}>
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: colors.text }]}>
              {notification.authors[0].displayName ||
                notification.authors[0].handle}
            </Text>
            <Text
              style={[styles.authorHandle, { color: colors.tabIconDefault }]}
            >
              @{notification.authors[0].handle}
            </Text>
          </View>
          <Text style={[styles.reasonText, { color: colors.text }]}>
            {getReasonText(notification.type, notification.count)}
          </Text>
          {notification.postContent && (
            <Text
              style={[styles.postContent, { color: colors.tabIconDefault }]}
              numberOfLines={2}
            >
              &ldquo;{notification.postContent}&rdquo;
            </Text>
          )}
          <Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
            {formatTime(notification.latestTimestamp)}
          </Text>
        </View>
      </View>
      {!notification.isRead && (
        <View
          style={[styles.unreadIndicator, { backgroundColor: colors.tint }]}
        />
      )}
    </TouchableOpacity>
  );
}

/**
 * Group notifications by type and subject
 */
function groupNotifications(notifications: any[]): GroupedNotification[] {
  const groups = new Map<string, GroupedNotification>();

  notifications.forEach((notification) => {
    // Create a key for grouping by type and subject
    const groupKey = `${notification.reason}_${
      notification.reasonSubject || "none"
    }`;

    if (groups.has(groupKey)) {
      const group = groups.get(groupKey)!;
      // Check if this author is already in the group
      const existingAuthor = group.authors.find(
        (author) => author.did === notification.author.did
      );

      if (!existingAuthor) {
        // Add new author to the group
        group.authors.push({
          did: notification.author.did,
          handle: notification.author.handle,
          displayName: notification.author.displayName,
          avatar: notification.author.avatar,
        });
        group.count++;
      }

      group.isRead = group.isRead && notification.isRead;
      // Keep the latest timestamp
      if (new Date(notification.indexedAt) > new Date(group.latestTimestamp)) {
        group.latestTimestamp = notification.indexedAt;
      }
    } else {
      groups.set(groupKey, {
        id: groupKey,
        type: notification.reason as GroupedNotification["type"],
        subject: notification.reasonSubject,
        postContent: notification.postContent,
        authors: [
          {
            did: notification.author.did,
            handle: notification.author.handle,
            displayName: notification.author.displayName,
            avatar: notification.author.avatar,
          },
        ],
        isRead: notification.isRead,
        latestTimestamp: notification.indexedAt,
        count: 1,
      });
    }
  });

  return Array.from(groups.values()).sort(
    (a, b) =>
      new Date(b.latestTimestamp).getTime() -
      new Date(a.latestTimestamp).getTime()
  );
}

/**
 * Notifications screen component
 */
export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useNotifications(50);

  const notifications = data?.pages.flatMap((page) => page.notifications) ?? [];
  const groupedNotifications = groupNotifications(notifications);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleNotificationPress = (notification: GroupedNotification) => {
    if (notification.type === "follow") {
      // Navigate to the first author's profile
      router.push(
        `/profile/${encodeURIComponent(notification.authors[0].handle)}`
      );
    } else if (notification.subject) {
      // Navigate to the post
      router.push(`/post/${encodeURIComponent(notification.subject)}`);
    } else {
      // For notifications without a subject, navigate to the first author's profile
      router.push(
        `/profile/${encodeURIComponent(notification.authors[0].handle)}`
      );
    }
  };

  const renderNotification = ({ item }: { item: GroupedNotification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <ThemedText style={styles.emptyStateTitle}>
        No notifications yet
      </ThemedText>
      <ThemedText style={styles.emptyStateSubtitle}>
        When you get notifications, they&apos;ll appear here
      </ThemedText>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <ThemedText style={styles.errorTitle}>
        Failed to load notifications
      </ThemedText>
      <ThemedText style={styles.errorMessage}>
        {error?.message || "Please try again later"}
      </ThemedText>
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: colors.tint }]}
        onPress={() => refetch()}
      >
        <Text style={[styles.retryButtonText, { color: colors.background }]}>
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <ThemedText style={styles.title}>Notifications</ThemedText>
      </View>

      {isError ? (
        renderErrorState()
      ) : (
        <FlatList
          data={groupedNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={!isLoading ? renderEmptyState : null}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.tint}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadingFooter}>
                <ThemedText style={styles.loadingText}>Loading...</ThemedText>
              </View>
            ) : null
          }
        />
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
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  listContainer: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  notificationContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarsContainer: {
    flexDirection: "row",
    marginRight: 12,
    marginTop: 2,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  avatarOverflow: {
    backgroundColor: "#666",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOverflowText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
  },
  notificationText: {
    flex: 1,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  authorName: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  authorHandle: {
    fontSize: 14,
  },
  reasonText: {
    fontSize: 15,
    marginBottom: 4,
  },
  postContent: {
    fontSize: 14,
    marginBottom: 4,
    fontStyle: "italic",
  },
  timeText: {
    fontSize: 12,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    alignSelf: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
    opacity: 0.7,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingFooter: {
    paddingVertical: 16,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
});
