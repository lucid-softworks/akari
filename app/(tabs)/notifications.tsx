import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useRef } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { NotificationSkeleton } from '@/components/skeletons';
import { useNotifications } from '@/hooks/queries/useNotifications';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { formatRelativeTime } from '@/utils/timeUtils';

/**
 * Grouped notification type
 */
type GroupedNotification = {
  id: string;
  type: 'like' | 'repost' | 'follow' | 'reply' | 'mention' | 'quote';
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
  borderColor: string;
};

function NotificationItem({ notification, onPress, borderColor }: NotificationItemProps) {
  const { t } = useTranslation();

  const getReasonText = (type: string, count: number) => {
    const action = (() => {
      switch (type) {
        case 'like':
          return t('notifications.likedYourPost');
        case 'repost':
          return t('notifications.repostedYourPost');
        case 'follow':
          return t('notifications.startedFollowingYou');
        case 'reply':
          return t('notifications.repliedToYourPost');
        case 'mention':
          return t('notifications.mentionedYou');
        case 'quote':
          return t('notifications.quotedYourPost');
        default:
          return type;
      }
    })();

    if (count === 1) {
      return action;
    } else if (count === 2) {
      return t('notifications.andOneOther', { action });
    } else {
      return t('notifications.andOthers', { count: count - 1, action });
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
                placeholder={require('@/assets/images/partial-react-logo.png')}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>{(author.displayName || author.handle)[0].toUpperCase()}</Text>
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
    <TouchableOpacity style={[styles.notificationItem, { borderBottomColor: borderColor }]} onPress={onPress}>
      <View style={styles.avatarContainer}>{renderAvatars()}</View>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <ThemedText style={styles.authorNames}>
            {notification.authors.map((author) => author.displayName || author.handle).join(', ')}
          </ThemedText>
          <ThemedText style={styles.timestamp}>{formatRelativeTime(notification.latestTimestamp)}</ThemedText>
        </View>
        <ThemedText style={styles.reasonText}>{getReasonText(notification.type, notification.count)}</ThemedText>
        {notification.postContent && (
          <ThemedText style={styles.postContent} numberOfLines={2}>
            {notification.postContent}
          </ThemedText>
        )}
      </View>
      {!notification.isRead && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );
}

/**
 * Group notifications by type and subject
 */
type NotificationData = {
  id: string;
  author: {
    did: string;
    handle: string;
    displayName: string;
    avatar: string;
  };
  reason: string;
  reasonSubject?: string;
  isRead: boolean;
  indexedAt: string;
  postContent?: string;
};

function groupNotifications(notifications: NotificationData[]): GroupedNotification[] {
  const groups = new Map<string, GroupedNotification>();

  notifications.forEach((notification) => {
    // Create a key for grouping by type and subject
    const groupKey = `${notification.reason}_${notification.reasonSubject || 'none'}`;

    if (groups.has(groupKey)) {
      const group = groups.get(groupKey)!;
      // Check if this author is already in the group
      const existingAuthor = group.authors.find((author) => author.did === notification.author.did);

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
        type: notification.reason as GroupedNotification['type'],
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
    (a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime(),
  );
}

/**
 * Notifications screen component
 */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();
  const flatListRef = useRef<FlatList>(null);
  const { t } = useTranslation();

  // Create scroll to top function
  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Register with the tab scroll registry
  React.useEffect(() => {
    tabScrollRegistry.register('notifications', scrollToTop);
  }, []);

  const {
    data: notificationsData,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useNotifications();

  const notifications = notificationsData?.pages.flatMap((page) => page.notifications) ?? [];
  const groupedNotifications = groupNotifications(notifications);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleNotificationPress = (notification: GroupedNotification) => {
    if (notification.type === 'follow') {
      // Navigate to the first author's profile
      router.push(`/profile/${encodeURIComponent(notification.authors[0].handle)}`);
    } else if (notification.subject) {
      // Navigate to the post
      router.push(`/post/${encodeURIComponent(notification.subject)}`);
    } else {
      // For notifications without a subject, navigate to the first author's profile
      router.push(`/profile/${encodeURIComponent(notification.authors[0].handle)}`);
    }
  };

  const renderNotification = ({ item }: { item: GroupedNotification }) => (
    <NotificationItem notification={item} onPress={() => handleNotificationPress(item)} borderColor={borderColor} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <ThemedText style={styles.emptyStateTitle}>{t('notifications.noNotificationsYet')}</ThemedText>
      <ThemedText style={styles.emptyStateSubtitle}>{t('notifications.notificationsWillAppearHere')}</ThemedText>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyState}>
      <ThemedText style={styles.emptyStateTitle}>{t('notifications.errorLoadingNotifications')}</ThemedText>
      <ThemedText style={styles.emptyStateSubtitle}>{error?.message || t('notifications.somethingWentWrong')}</ThemedText>
    </View>
  );

  if (isError) {
    return <ThemedView style={[styles.container, { paddingTop: insets.top }]}>{renderErrorState()}</ThemedView>;
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>{t('navigation.notifications')}</ThemedText>
      </ThemedView>

      <FlatList
        ref={flatListRef}
        data={groupedNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        style={styles.notificationsList}
        contentContainerStyle={styles.notificationsListContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ThemedView style={styles.loadingMore}>
              <ThemedText style={styles.loadingMoreText}>{t('notifications.loadingMoreNotifications')}</ThemedText>
            </ThemedView>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <ThemedView style={styles.skeletonContainer}>
              {Array.from({ length: 12 }).map((_, index) => (
                <NotificationSkeleton key={index} />
              ))}
            </ThemedView>
          ) : (
            renderEmptyState()
          )
        }
      />
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
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  listContainer: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarsContainer: {
    flexDirection: 'row',
    marginRight: 12,
    marginTop: 2,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  avatarOverflow: {
    backgroundColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverflowText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  notificationText: {
    flex: 1,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
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
    fontStyle: 'italic',
  },
  timeText: {
    fontSize: 12,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    alignSelf: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  skeletonContainer: {
    flex: 1,
    paddingBottom: 100, // Account for tab bar
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
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
    fontWeight: '600',
  },
  loadingFooter: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsListContent: {
    paddingBottom: 16, // Add some padding at the bottom for the footer
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    opacity: 0.7,
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.7,
  },
  avatarContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorNames: {
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 14,
    opacity: 0.7,
  },
});
