import { useResponsive } from '@/hooks/useResponsive';
import { cdnImageUrl } from '@/utils/cdn';
import { Image } from '@/components/Image';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View, type ImageStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlueskyEmbed, BlueskyVerification } from '@/bluesky-api';
import { TabBar } from '@/components/TabBar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VerificationBadge } from '@/components/VerificationBadge';
import { NotificationSkeleton } from '@/components/skeletons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { PressableLink } from '@/components/ui/PressableLink';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useNotifications } from '@/hooks/queries/useNotifications';
import { queryKeys } from '@/hooks/queryKeys';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToPost, useNavigateToProfile } from '@/utils/navigation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { formatRelativeTime } from '@/utils/timeUtils';
import { spacing, radius, fontSize, fontWeight, opacity, layout, activeOpacity, semanticColors } from '@/constants/tokens';
import { apiForAccount } from '@/utils/blueskyApi';

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
    verification?: BlueskyVerification;
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
  href: string;
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
  borderRadius: radius.sm,
};

function NotificationImage({ uri }: { uri: string }) {
  const [aspectRatio, setAspectRatio] = useState(1);
  return (
    <Image
      source={{ uri }}
      style={[styles.embedImage, { aspectRatio }]}
      contentFit="contain"
      onLoad={(e) => {
        if (e.source.width && e.source.height) {
          setAspectRatio(e.source.width / e.source.height);
        }
      }}
    />
  );
}

function NotificationItem({ notification, onPress, href, borderColor }: NotificationItemProps) {
  const { t } = useTranslation();
  const iconColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'text');
  const likeColor = semanticColors.like;
  const repostColor = semanticColors.repost;

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

  const renderAuthorNames = (authors: typeof notification.authors) => {
    const first = authors[0];
    const firstName = first.displayName || first.handle;
    const firstBadge = (
      <VerificationBadge
        verification={first.verification}
        subjectHandle={first.handle}
        subjectDisplayName={first.displayName}
        size={14}
      />
    );

    if (authors.length === 1) {
      return (
        <>
          <ThemedText style={styles.authorNames} numberOfLines={1}>{firstName}</ThemedText>
          {firstBadge}
        </>
      );
    }

    if (authors.length === 2) {
      const second = authors[1];
      const secondName = second.displayName || second.handle;
      return (
        <>
          <ThemedText style={styles.authorNames} numberOfLines={1}>{firstName}</ThemedText>
          {firstBadge}
          <ThemedText style={styles.authorNames} numberOfLines={1}> and {secondName}</ThemedText>
          <VerificationBadge
            verification={second.verification}
            subjectHandle={second.handle}
            subjectDisplayName={second.displayName}
            size={14}
          />
        </>
      );
    }

    return (
      <>
        <ThemedText style={styles.authorNames} numberOfLines={1}>{firstName}</ThemedText>
        {firstBadge}
        <ThemedText style={styles.authorNames} numberOfLines={1}> and {authors.length - 1} others</ThemedText>
      </>
    );
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
    if (!notification.embed) return null;

    const authorDid = notification.authors[0]?.did;
    if (!authorDid) return null;

    // Extract image URLs - handle both resolved CDN URLs and raw blob refs
    const images: string[] = [];
    const embedImages = notification.embed.images ?? notification.embed.media?.images;
    if (embedImages) {
      for (const img of embedImages) {
        const url = img.thumb || img.fullsize;
        if (url && url.startsWith('http')) {
          images.push(url);
        } else if (img.image?.ref?.$link) {
          // Construct CDN URL from blob ref
          images.push(
            cdnImageUrl({
              size: 'feed_thumbnail',
              did: authorDid,
              blobRef: img.image.ref.$link,
            }),
          );
        }
      }
    }

    if (images.length === 0) return null;

    return (
      <View style={styles.embedImagesContainer}>
        {images.slice(0, 4).map((url) => (
          <NotificationImage key={url} uri={url} />
        ))}
      </View>
    );
  };

  const notificationIcon = getNotificationIcon(notification.type);

  return (
    <PressableLink
      href={href}
      onPress={onPress}
      style={[styles.notificationItem, { borderBottomColor: borderColor }]}
    >
      <View style={styles.mainContent}>
        <View style={styles.iconContainer}>
          <IconSymbol name={notificationIcon.name} size={18} color={notificationIcon.color} />
        </View>
        <View style={styles.avatarContainer}>{renderAvatars()}</View>
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <View style={styles.authorNamesRow}>
              {renderAuthorNames(notification.authors)}
            </View>
            <ThemedText style={styles.timestamp}>{formatRelativeTime(notification.latestTimestamp)}</ThemedText>
          </View>
          <ThemedText style={styles.reasonText}>{getReasonText(notification.type, notification.count)}</ThemedText>
          {notification.type === 'reply' ? <ThemedText style={styles.replyIndicator}>{t('ui.replyToYou')}</ThemedText> : null}
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
    </PressableLink>
  );
}

/**
 * Group notifications by type and subject
 */
type NotificationData = {
  id: string;
  /**
   * URI of the notification's own record (e.g. the reply / quote / mention
   * post). Distinct from `reasonSubject`, which is the URI of the thing
   * the action targets — for a reply that's the parent post, for a like
   * it's your post. Tapping a reply notification should land on the
   * reply itself, so we route via `uri` for reply/mention/quote.
   */
  uri?: string;
  author: {
    did: string;
    handle: string;
    displayName: string;
    avatar: string;
    verification?: BlueskyVerification;
  };
  reason: string;
  reasonSubject?: string;
  isRead: boolean;
  indexedAt: string;
  postContent?: string;
  embed?: BlueskyEmbed;
};

/**
 * The URI a tap on this notification should navigate to. For likes and
 * reposts the user wants to revisit *their* post (the subject). For
 * replies, mentions, and quotes the user wants to read the new post that
 * triggered the notification — that's `notification.uri`. Falls back to
 * `reasonSubject` when `uri` is unavailable so we never break a tap.
 */
function notificationTargetUri(notification: { reason: string; uri?: string; reasonSubject?: string }): string | undefined {
  switch (notification.reason) {
    case 'reply':
    case 'mention':
    case 'quote':
      return notification.uri ?? notification.reasonSubject;
    default:
      return notification.reasonSubject;
  }
}

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
            verification: notification.author.verification,
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
          subject: notificationTargetUri(notification),
          postContent: notification.postContent,
          embed: notification.embed,
          authors: [
            {
              did: notification.author.did,
              handle: notification.author.handle,
              displayName: notification.author.displayName,
              avatar: notification.author.avatar,
              verification: notification.author.verification,
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
        subject: notificationTargetUri(notification),
        postContent: notification.postContent,
        embed: notification.embed,
        authors: [
          {
            did: notification.author.did,
            handle: notification.author.handle,
            displayName: notification.author.displayName,
            avatar: notification.author.avatar,
            verification: notification.author.verification,
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

  return allNotifications.toSorted((a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime());
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
  const navigateToPost = useNavigateToPost();
  const navigateToProfile = useNavigateToProfile();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  const queryClient = useQueryClient();

  // Mark notifications as seen each time the tab is focused. Tabs stay
  // mounted in expo-router, so a plain useEffect would only fire on first
  // mount and the badge would persist when revisiting with new arrivals.
  useFocusEffect(
    useCallback(() => {
      if (!token || !currentAccount?.pdsUrl || !currentAccount.did) return;
      const did = currentAccount.did;
      const api = apiForAccount(currentAccount);
      void api.markNotificationsSeen(token).then(() => {
        queryClient.setQueryData(queryKeys.notifications.unread(did), 0);
      });
    }, [token, currentAccount, queryClient]),
  );

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

  const getNotificationHref = useCallback((notification: GroupedNotification): string => {
    if (notification.type === 'follow') {
      return `/profile/${notification.authors[0].handle}`;
    }
    if (notification.subject) {
      const uriParts = notification.subject.split('/');
      const actor = uriParts[2];
      const rKey = uriParts[uriParts.length - 1];
      return `/profile/${actor}/post/${rKey}`;
    }
    return `/profile/${notification.authors[0].handle}`;
  }, []);

  const renderNotificationItem = useCallback(
    (notification: GroupedNotification) => (
      <NotificationItem
        notification={notification}
        onPress={() => handleNotificationPress(notification)}
        href={getNotificationHref(notification)}
        borderColor={borderColor}
      />
    ),
    [borderColor, handleNotificationPress, getNotificationHref],
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

    void fetchNextPage();
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
      <ThemedView
        style={[
          styles.headerContainer,
          {
            paddingTop: isLargeScreen ? insets.top : 0,
            paddingBottom: isLargeScreen ? spacing.md : 0,
          },
        ]}
      >
        {isLargeScreen ? (
          <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
            <ThemedText style={styles.title}>{t('navigation.notifications')}</ThemedText>
          </ThemedView>
        ) : null}
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
      </ThemedView>
    ),
    [activeTab, borderColor, handleTabChange, insets.top, isLargeScreen, t, tabs],
  );

  if (isError) {
    return (
      <ThemedView style={[styles.container, { paddingTop: isLargeScreen ? insets.top : 0 }]}>
        {renderErrorState()}
      </ThemedView>
    );
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
  headerContainer: {},
  listContent: {
    paddingBottom: layout.tabBarPadding,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
  },
  listContainer: {
    flexGrow: 1,
  },
  notificationItem: {
    paddingHorizontal: spacing.lg,
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
    borderWidth: layout.border,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  avatarFallbackText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: 'white',
  },
  avatarOverflow: {
    backgroundColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: layout.border,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  avatarOverflowText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: 'white',
  },
  notificationText: {
    flex: 1,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  authorName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginRight: spacing.sm,
  },
  authorHandle: {
    fontSize: fontSize.base,
  },
  reasonText: {
    fontSize: fontSize.md,
    marginBottom: 6,
    opacity: opacity.secondary,
  },
  replyIndicator: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
    opacity: opacity.tertiary,
  },
  postContent: {
    fontSize: fontSize.md,
    marginBottom: spacing.xs,
    opacity: 0.8,
    lineHeight: 16,
  },
  postContentContainer: {
    marginTop: spacing.xs,
  },
  embedImagesContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  embedImage: {
    ...EMBED_IMAGE_STYLE,
    width: '100%',
    backgroundColor: '#000',
  },
  timeText: {
    fontSize: fontSize.sm,
  },
  unreadIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: spacing.sm,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  skeletonContainer: {
    flex: 1,
    paddingBottom: layout.tabBarPadding,
  },
  emptyStateTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    opacity: opacity.secondary,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  errorTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginBottom: spacing.lg,
    opacity: opacity.secondary,
  },
  retryButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  retryButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
  },
  loadingMore: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    opacity: opacity.secondary,
  },
  avatarContainer: {
    marginRight: spacing.md,
    marginTop: spacing.xxs,
  },
  contentContainer: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  authorNames: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  authorNamesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    gap: spacing.xxs,
    flexWrap: 'wrap',
  },
  timestamp: {
    fontSize: fontSize.sm,
    opacity: opacity.tertiary,
  },
  iconContainer: {
    marginRight: 10,
    marginTop: spacing.xs,
    width: 18,
    alignItems: 'center',
  },
});
