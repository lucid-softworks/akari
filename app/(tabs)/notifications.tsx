import { useResponsive } from '@/hooks/useResponsive';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useRef } from 'react';
import { Dimensions, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { NotificationSkeleton } from '@/components/skeletons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useNotifications } from '@/hooks/queries/useNotifications';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { BlueskyEmbed } from '@/utils/bluesky/types';
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
  embed?: BlueskyEmbed; // Embed data for the post
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
  const iconColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'text');
  const likeColor = '#ff3b30';
  const repostColor = '#34c759';

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return { name: 'heart.fill' as const, color: likeColor };
      case 'repost':
        return { name: 'arrow.2.squarepath' as const, color: repostColor };
      case 'follow':
        return { name: 'person.fill' as const, color: iconColor };
      case 'reply':
        return { name: 'bubble.left' as const, color: iconColor };
      case 'mention':
        return { name: 'at' as const, color: iconColor };
      case 'quote':
        return { name: 'quote.bubble' as const, color: iconColor };
      default:
        return { name: 'bell' as const, color: iconColor };
    }
  };

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

  const formatAuthorNames = (authors: typeof notification.authors) => {
    if (authors.length === 1) {
      return authors[0].displayName || authors[0].handle;
    } else if (authors.length === 2) {
      const name1 = authors[0].displayName || authors[0].handle;
      const name2 = authors[1].displayName || authors[1].handle;
      return `${name1} and ${name2}`;
    } else {
      const firstName = authors[0].displayName || authors[0].handle;
      return `${firstName} and ${authors.length - 1} others`;
    }
  };

  const renderAvatars = () => {
    const maxAvatars = 4;
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
                marginLeft: index > 0 ? -6 : 0,
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
                marginLeft: -6,
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

  const renderEmbedImages = () => {
    if (!notification.embed || !notification.embed.images || notification.embed.images.length === 0) {
      return null;
    }

    const images = notification.embed.images.slice(0, 2); // Show max 2 images in notifications
    const fullWidth = Dimensions.get('window').width;
    const aspectRatio = 16 / 9; // Default aspect ratio
    const imageHeight = fullWidth / aspectRatio;

    return (
      <View style={styles.embedImagesContainer}>
        {images.map((image, index) => (
          <Image
            key={index}
            source={{ uri: image.fullsize }}
            style={[styles.embedImage, { width: fullWidth, height: imageHeight }]}
            contentFit="cover"
            placeholder={require('@/assets/images/partial-react-logo.png')}
          />
        ))}
      </View>
    );
  };

  const notificationIcon = getNotificationIcon(notification.type);

  return (
    <TouchableOpacity
      style={[styles.notificationItem, { borderBottomColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.mainContent}>
        <View style={styles.iconContainer}>
          <IconSymbol name={notificationIcon.name} size={18} color={notificationIcon.color} />
        </View>
        <View style={styles.avatarContainer}>{renderAvatars()}</View>
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <ThemedText style={styles.authorNames} numberOfLines={1}>
              {formatAuthorNames(notification.authors)}
            </ThemedText>
            <ThemedText style={styles.timestamp}>{formatRelativeTime(notification.latestTimestamp)}</ThemedText>
          </View>
          <ThemedText style={styles.reasonText}>{getReasonText(notification.type, notification.count)}</ThemedText>
          {notification.type === 'reply' ? <ThemedText style={styles.replyIndicator}>Reply to you</ThemedText> : null}
        </View>
        {!notification.isRead ? <View style={styles.unreadIndicator} /> : null}
      </View>
      {notification.postContent && (
        <View style={styles.postContentContainer}>
          <ThemedText style={styles.postContent} numberOfLines={2}>
            {notification.postContent}
          </ThemedText>
          {renderEmbedImages()}
        </View>
      )}
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
  embed?: BlueskyEmbed;
};

function groupNotifications(notifications: NotificationData[]): GroupedNotification[] {
  const groups = new Map<string, GroupedNotification>();
  const individualNotifications: GroupedNotification[] = [];

  notifications.forEach((notification) => {
    // Only group likes and reposts
    const shouldGroup = notification.reason === 'like' || notification.reason === 'repost';

    if (shouldGroup) {
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
          embed: notification.embed,
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
    } else {
      // For replies, quotes, follows, mentions - keep as individual notifications
      individualNotifications.push({
        id: notification.id || `${notification.author.did}_${notification.indexedAt}`,
        type: notification.reason as GroupedNotification['type'],
        subject: notification.reasonSubject,
        postContent: notification.postContent,
        embed: notification.embed,
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

  // Combine grouped and individual notifications
  const allNotifications = [...Array.from(groups.values()), ...individualNotifications];

  return allNotifications.sort((a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime());
}

/**
 * Notifications screen component
 */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();
  const flatListRef = useRef<FlatList>(null);
  const { t } = useTranslation();
  const { isLargeScreen } = useResponsive();

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
    <ScrollView style={[styles.container, { paddingTop: isLargeScreen ? 0 : insets.top }]}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>{t('navigation.notifications')}</ThemedText>
      </ThemedView>

      <View style={styles.notificationsList}>
        {isLoading ? (
          <ThemedView style={styles.skeletonContainer}>
            {Array.from({ length: 12 }).map((_, index) => (
              <NotificationSkeleton key={index} />
            ))}
          </ThemedView>
        ) : groupedNotifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {groupedNotifications.map((item) => (
              <View key={item.id}>{renderNotification({ item })}</View>
            ))}
            {isFetchingNextPage && (
              <ThemedView style={styles.loadingMore}>
                <ThemedText style={styles.loadingMoreText}>{t('notifications.loadingMoreNotifications')}</ThemedText>
              </ThemedView>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    // Remove all flex constraints to allow natural flow
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  listContainer: {
    flexGrow: 1,
  },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 72,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarFallback: {
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  avatarFallbackText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  avatarOverflow: {
    backgroundColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  avatarOverflowText: {
    fontSize: 10,
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
    fontSize: 13,
    marginBottom: 6,
    opacity: 0.7,
  },
  replyIndicator: {
    fontSize: 12,
    marginBottom: 4,
    opacity: 0.6,
  },
  postContent: {
    fontSize: 13,
    marginBottom: 4,
    opacity: 0.8,
    lineHeight: 16,
  },
  postContentContainer: {
    marginTop: 4,
  },
  embedImagesContainer: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  embedImage: {
    borderRadius: 8,
  },
  timeText: {
    fontSize: 12,
  },
  unreadIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
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
    // Remove flex constraint to allow content to expand
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
    paddingRight: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorNames: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  iconContainer: {
    marginRight: 10,
    marginTop: 4,
    width: 18,
    alignItems: 'center',
  },
});
