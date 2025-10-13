import { useResponsive } from '@/hooks/useResponsive';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, type ImageStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlueskyEmbed } from '@/bluesky-api';
import { TabBar } from '@/components/TabBar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { NotificationSkeleton } from '@/components/skeletons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useNotifications } from '@/hooks/queries/useNotifications';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToPost, useNavigateToProfile } from '@/utils/navigation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { formatRelativeTime } from '@/utils/timeUtils';

/**
 * Grouped notification type
 */
type GroupedNotification = {
  id: string;
  type: 'like' | 'like-via-repost' | 'repost' | 'follow' | 'reply' | 'mention' | 'quote';
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

type NotificationsTab = 'all' | 'mentions';

/**
 * Notification item component
 */
type NotificationItemProps = {
  notification: GroupedNotification;
  onPress: () => void;
  borderColor: string;
};

// expo-image on web requires receiving plain object styles.
const AVATAR_IMAGE_STYLE: ImageStyle = {
  width: 28,
  height: 28,
  borderRadius: 14,
};

const EMBED_IMAGE_STYLE: ImageStyle = {
  // Keep embed previews compatible with expo-image on web.
  borderRadius: 8,
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
      case 'like-via-repost':
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
        case 'like-via-repost':
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
                style={AVATAR_IMAGE_STYLE}
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
            style={{
              ...EMBED_IMAGE_STYLE,
              width: fullWidth,
              height: imageHeight,
            }}
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
  const { t } = useTranslation();
  const { isLargeScreen } = useResponsive();
  const listRef = useRef<VirtualizedListHandle<GroupedNotification>>(null);
  const [activeTab, setActiveTab] = useState<NotificationsTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { data: currentAccount } = useCurrentAccount();
  const navigateToPost = useNavigateToPost();
  const navigateToProfile = useNavigateToProfile();

  const tabs = useMemo(
    () => [
      { key: 'all' as const, label: t('notifications.all') },
      { key: 'mentions' as const, label: t('notifications.mentions') },
    ],
    [t],
  );

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  useEffect(() => {
    tabScrollRegistry.register('notifications', scrollToTop);
  }, [scrollToTop]);

  useEffect(() => {
    scrollToTop();
  }, [activeTab, scrollToTop]);

  const handleTabChange = useCallback((tab: NotificationsTab) => {
    setActiveTab(tab);
  }, []);

  const {
    data: notificationsData,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useNotifications();

  const notifications = useMemo(
    () => notificationsData?.pages.flatMap((page) => page.notifications) ?? [],
    [notificationsData],
  );
  const groupedNotifications = useMemo(() => groupNotifications(notifications), [notifications]);
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'mentions') {
      return groupedNotifications.filter((notification) => notification.type === 'reply' || notification.type === 'quote');
    }

    return groupedNotifications;
  }, [activeTab, groupedNotifications]);

  const handleNotificationPress = useCallback(
    (notification: GroupedNotification) => {
      if (notification.type === 'follow') {
        // Navigate to the first author's profile
        navigateToProfile({ actor: notification.authors[0].handle });
      } else if (notification.subject) {
        // Navigate to the post in current tab context
        const postUri = notification.subject;
        const uriParts = postUri.split('/');
        const rKey = uriParts[uriParts.length - 1];
        const actor = uriParts[2]; // Extract actor from AT URI (at://actor/collection/rkey)
        navigateToPost({ actor, rKey });
      } else {
        // For notifications without a subject, navigate to the first author's profile
        navigateToProfile({ actor: notification.authors[0].handle });
      }
    },
    [navigateToProfile, navigateToPost],
  );

  const renderNotificationItem = useCallback(
    (notification: GroupedNotification) => (
      <NotificationItem
        notification={notification}
        onPress={() => handleNotificationPress(notification)}
        borderColor={borderColor}
      />
    ),
    [borderColor, handleNotificationPress],
  );

  const keyExtractor = useCallback((item: GroupedNotification) => item.id, []);

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyState}>
        <ThemedText style={styles.emptyStateTitle}>{t('notifications.noNotificationsYet')}</ThemedText>
        <ThemedText style={styles.emptyStateSubtitle}>{t('notifications.notificationsWillAppearHere')}</ThemedText>
      </View>
    ),
    [t],
  );

  const renderErrorState = useCallback(
    () => (
      <View style={styles.emptyState}>
        <ThemedText style={styles.emptyStateTitle}>{t('notifications.errorLoadingNotifications')}</ThemedText>
        <ThemedText style={styles.emptyStateSubtitle}>{error?.message || t('notifications.somethingWentWrong')}</ThemedText>
      </View>
    ),
    [error?.message, t],
  );

  const listEmptyComponent = useMemo(() => {
    if (isLoading) {
      return (
        <ThemedView style={styles.skeletonContainer}>
          {Array.from({ length: 12 }).map((_, index) => (
            <NotificationSkeleton key={index} />
          ))}
        </ThemedView>
      );
    }

    return renderEmptyState();
  }, [isLoading, renderEmptyState]);

  const listFooterComponent = useMemo(() => {
    if (!isFetchingNextPage) {
      return null;
    }

    return (
      <ThemedView style={styles.loadingMore}>
        <ThemedText style={styles.loadingMoreText}>{t('notifications.loadingMoreNotifications')}</ThemedText>
      </ThemedView>
    );
  }, [isFetchingNextPage, t]);

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('[NotificationsScreen] Refresh failed', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const listHeaderComponent = useCallback(
    () => (
      <ThemedView style={[styles.headerContainer, { paddingTop: isLargeScreen ? 0 : insets.top }]}>
        <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
          <ThemedText style={styles.title}>{t('navigation.notifications')}</ThemedText>
        </ThemedView>
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
      </ThemedView>
    ),
    [activeTab, borderColor, handleTabChange, insets.top, isLargeScreen, t, tabs],
  );

  if (isError) {
    return <ThemedView style={[styles.container, { paddingTop: insets.top }]}>{renderErrorState()}</ThemedView>;
  }

  return (
    <ThemedView style={styles.container}>
      <VirtualizedList
        ref={listRef}
        data={filteredNotifications}
        renderItem={({ item }) => renderNotificationItem(item)}
        keyExtractor={keyExtractor}
        estimatedItemSize={160}
        overscan={2}
        ListFooterComponent={listFooterComponent ?? undefined}
        ListEmptyComponent={listEmptyComponent}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        ListHeaderComponent={listHeaderComponent}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingBottom: 12,
  },
  listContent: {
    paddingBottom: 100,
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
    ...AVATAR_IMAGE_STYLE,
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
    ...EMBED_IMAGE_STYLE,
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
