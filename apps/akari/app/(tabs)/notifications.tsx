import { useResponsive } from '@/hooks/useResponsive';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo, useRef } from 'react';
import { Dimensions, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { NotificationSkeleton } from '@/components/skeletons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useNotifications } from '@/hooks/queries/useNotifications';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppTheme, type AppThemeColors } from '@/theme';
import { BlueskyEmbed } from '@/bluesky-api';
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
  colors: AppThemeColors;
};

function NotificationItem({ notification, onPress, borderColor, colors }: NotificationItemProps) {
  const { t } = useTranslation();
  const itemStyles = useMemo(() => createNotificationItemStyles(colors), [colors]);
  const iconColor = colors.accent;
  const likeColor = colors.danger;
  const repostColor = colors.success;

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
      <View style={itemStyles.avatarsContainer}>
        {avatarsToShow.map((author, index) => (
          <View
            key={author.did}
            style={[
              itemStyles.avatarWrapper,
              {
                marginLeft: index > 0 ? -6 : 0,
                zIndex: maxAvatars - index,
              },
            ]}
          >
            {author.avatar ? (
              <Image
                source={{ uri: author.avatar }}
                style={itemStyles.avatar}
                contentFit="cover"
                placeholder={require('@/assets/images/partial-react-logo.png')}
              />
            ) : (
              <View style={[itemStyles.avatar, itemStyles.avatarFallback]}>
                <Text style={itemStyles.avatarFallbackText}>{(author.displayName || author.handle)[0].toUpperCase()}</Text>
              </View>
            )}
          </View>
        ))}
        {remainingCount > 0 && (
          <View
            style={[
              itemStyles.avatarWrapper,
              {
                marginLeft: -6,
                zIndex: 0,
              },
            ]}
          >
            <View style={[itemStyles.avatar, itemStyles.avatarOverflow]}>
              <Text style={itemStyles.avatarOverflowText}>+{remainingCount}</Text>
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
      <View style={itemStyles.embedImagesContainer}>
        {images.map((image, index) => (
          <Image
            key={index}
            source={{ uri: image.fullsize }}
            style={[itemStyles.embedImage, { width: fullWidth, height: imageHeight }]}
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
      style={[itemStyles.notificationItem, { borderBottomColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={itemStyles.mainContent}>
        <View style={itemStyles.iconContainer}>
          <IconSymbol name={notificationIcon.name} size={18} color={notificationIcon.color} />
        </View>
        <View style={itemStyles.avatarContainer}>{renderAvatars()}</View>
        <View style={itemStyles.contentContainer}>
          <View style={itemStyles.headerRow}>
            <ThemedText style={itemStyles.authorNames} numberOfLines={1}>
              {formatAuthorNames(notification.authors)}
            </ThemedText>
            <ThemedText style={itemStyles.timestamp}>{formatRelativeTime(notification.latestTimestamp)}</ThemedText>
          </View>
          <ThemedText style={itemStyles.reasonText}>{getReasonText(notification.type, notification.count)}</ThemedText>
          {notification.type === 'reply' ? <ThemedText style={itemStyles.replyIndicator}>Reply to you</ThemedText> : null}
        </View>
        {!notification.isRead ? <View style={itemStyles.unreadIndicator} /> : null}
      </View>
      {notification.postContent && (
        <View style={itemStyles.postContentContainer}>
          <ThemedText style={itemStyles.postContent} numberOfLines={2}>
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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useNotifications();

  const notifications = notificationsData?.pages.flatMap((page) => page.notifications) ?? [];
  const groupedNotifications = groupNotifications(notifications);

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
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
      borderColor={borderColor}
      colors={colors}
    />
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

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
    },
    notificationsList: {
      backgroundColor: colors.background,
    },
    skeletonContainer: {
      flex: 1,
      paddingBottom: 100,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingVertical: 48,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderMuted,
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
    loadingMore: {
      paddingVertical: 16,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    loadingMoreText: {
      fontSize: 14,
      opacity: 0.7,
    },
  });
}

function createNotificationItemStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    notificationItem: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      minHeight: 72,
      backgroundColor: colors.surface,
    },
    mainContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconContainer: {
      marginRight: 10,
      marginTop: 4,
      width: 18,
      alignItems: 'center',
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
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    avatarFallbackText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.inverseText,
    },
    avatarOverflow: {
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderMuted,
    },
    avatarOverflowText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: colors.text,
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
    postContentContainer: {
      marginTop: 4,
    },
    postContent: {
      fontSize: 13,
      marginBottom: 4,
      opacity: 0.8,
      lineHeight: 16,
    },
    embedImagesContainer: {
      flexDirection: 'row',
      marginTop: 4,
      gap: 4,
    },
    embedImage: {
      borderRadius: 8,
    },
    unreadIndicator: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginLeft: 8,
      alignSelf: 'center',
      backgroundColor: colors.accent,
    },
  });
}
