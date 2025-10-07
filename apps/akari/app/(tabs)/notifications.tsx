import { useResponsive } from '@/hooks/useResponsive';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  type ImageStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { NotificationSkeleton } from '@/components/skeletons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { TabBar } from '@/components/TabBar';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { useNotifications } from '@/hooks/queries/useNotifications';
import { useProfile } from '@/hooks/queries/useProfile';
import { useActivityInsights, type ActivityPeriod } from '@/hooks/queries/useActivityInsights';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { BlueskyEmbed } from '@/bluesky-api';
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

type ActivitySummaryProps = {
  points: ActivitySummaryPoint[];
  totalNotes: number;
  newFollowers: number;
  totalFollowers: number;
  locale: string;
  title: string;
  notesLabel: string;
  newFollowersLabel: string;
  totalFollowersLabel: string;
  periodLabel: string;
  periodOptions: { label: string; value: ActivityPeriod }[];
  onSelectPeriod: (period: ActivityPeriod) => void;
  activePeriod: ActivityPeriod;
  activeMetric: 'notes' | 'followers';
  onSelectMetric: (metric: 'notes' | 'followers') => void;
  isLoading: boolean;
  loadingLabel: string;
  emptyLabel: string;
  periodA11yLabel: string;
};

type ActivitySummaryPoint = {
  dateKey: string;
  label: string;
  notes: number;
  followers: number;
};

type NotificationsListItem =
  | { kind: 'tabs' }
  | { kind: 'notification'; notification: GroupedNotification };

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function ActivitySummary({
  points,
  totalNotes,
  newFollowers,
  totalFollowers,
  locale,
  title,
  notesLabel,
  newFollowersLabel,
  totalFollowersLabel,
  periodLabel,
  periodOptions,
  onSelectPeriod,
  activePeriod,
  activeMetric,
  onSelectMetric,
  isLoading,
  loadingLabel,
  emptyLabel,
  periodA11yLabel,
}: ActivitySummaryProps) {
  const [graphWidth, setGraphWidth] = useState(0);
  const [isPeriodPickerVisible, setIsPeriodPickerVisible] = useState(false);
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const followerAccent = useThemeColor({ light: '#34C759', dark: '#34C759' }, 'tint');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F2937' }, 'border');
  const textSecondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const graphHeight = 120;

  const activeAccent = activeMetric === 'notes' ? accentColor : followerAccent;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setGraphWidth(event.nativeEvent.layout.width);
  }, []);

  const coordinates = useMemo(() => {
    if (points.length === 0 || graphWidth === 0) {
      return [] as { x: number; y: number; value: number }[];
    }

    const values = points.map((point) =>
      activeMetric === 'notes' ? point.notes : point.followers,
    );
    const maxValue = Math.max(1, ...values);
    const horizontalStep = points.length > 1 ? graphWidth / (points.length - 1) : 0;

    return points.map((point, index) => {
      const pointValue = values[index];
      const ratio = pointValue / maxValue;
      const paddedHeight = graphHeight - 24;
      const y = graphHeight - 12 - ratio * paddedHeight;
      const x = points.length === 1 ? graphWidth / 2 : index * horizontalStep;
      return { x, y, value: pointValue };
    });
  }, [activeMetric, graphWidth, points]);

  const segments = useMemo(() => {
    if (coordinates.length < 2) {
      return [] as {
        x: number;
        y: number;
        length: number;
        angle: number;
      }[];
    }

    const values: {
      x: number;
      y: number;
      length: number;
      angle: number;
    }[] = [];

    for (let index = 0; index < coordinates.length - 1; index += 1) {
      const start = coordinates[index];
      const end = coordinates[index + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const midpointX = (start.x + end.x) / 2;
      const midpointY = (start.y + end.y) / 2;
      values.push({ x: midpointX, y: midpointY, length, angle });
    }

    return values;
  }, [coordinates]);

  const handlePeriodOpen = useCallback(() => {
    setIsPeriodPickerVisible(true);
  }, []);

  const handlePeriodClose = useCallback(() => {
    setIsPeriodPickerVisible(false);
  }, []);

  const handlePeriodSelect = useCallback(
    (period: ActivityPeriod) => {
      setIsPeriodPickerVisible(false);
      if (period !== activePeriod) {
        onSelectPeriod(period);
      }
    },
    [activePeriod, onSelectPeriod],
  );

  const handleMetricSelect = useCallback(
    (metric: 'notes' | 'followers') => {
      if (metric !== activeMetric) {
        onSelectMetric(metric);
      }
    },
    [activeMetric, onSelectMetric],
  );

  const hasPoints = points.length > 0;

  return (
    <ThemedView style={[styles.summaryCard, { borderColor }]}>
      <View style={styles.summaryHeaderRow}>
        <ThemedText style={styles.summaryTitle}>{title}</ThemedText>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={periodA11yLabel}
          onPress={handlePeriodOpen}
          style={styles.periodButton}
        >
          <ThemedText style={[styles.periodButtonText, { color: textSecondary }]}>
            {periodLabel}
          </ThemedText>
          <IconSymbol name="chevron.down" size={16} color={textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={[styles.graphContainer, { borderColor }]} onLayout={handleLayout}>
        <View style={styles.graphGrid}>
          {Array.from({ length: 3 }).map((_, index) => (
            <View
              key={index}
              style={[styles.graphGridLine, { top: ((index + 1) / 4) * 100 + '%' }]}
            />
          ))}
        </View>
        {hasPoints &&
          segments.map((segment, index) => (
            <View
              key={`segment-${segment.x}-${segment.y}-${index}`}
              style={{
                position: 'absolute',
                left: segment.x - segment.length / 2,
                top: segment.y - 1,
                width: segment.length,
                height: 2,
                backgroundColor: activeAccent,
                transform: [{ rotateZ: `${segment.angle}rad` }],
              }}
            />
          ))}
        {hasPoints &&
          coordinates.map((point, index) => (
            <React.Fragment key={`point-${index}`}>
              <View
                style={{
                  position: 'absolute',
                  left: point.x - 6,
                  top: point.y - 6,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: activeAccent,
                }}
              />
              <ThemedText
                style={[styles.graphValueLabel, { left: point.x - 12, top: point.y - 28 }]}
              >
                {formatNumber(point.value, locale)}
              </ThemedText>
              <ThemedText style={[styles.graphDateLabel, { left: point.x - 18 }]}>
                {points[index]?.label}
              </ThemedText>
            </React.Fragment>
          ))}
        {!hasPoints && (
          <View style={styles.graphEmptyState}>
            <ThemedText style={[styles.graphEmptyStateText, { color: textSecondary }]}> 
              {isLoading ? loadingLabel : emptyLabel}
            </ThemedText>
          </View>
        )}
      </View>
      <View style={styles.summaryStatsRow}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            styles.summaryStat,
            styles.summaryStatButton,
            { borderColor },
            activeMetric === 'notes' && [styles.summaryStatActive, { borderColor: activeAccent }],
          ]}
          onPress={() => handleMetricSelect('notes')}
        >
          <ThemedText
            style={[
              styles.summaryStatValue,
              activeMetric === 'notes' && { color: activeAccent },
            ]}
          >
            {formatNumber(totalNotes, locale)}
          </ThemedText>
          <ThemedText style={[styles.summaryStatLabel, { color: textSecondary }]}>
            {notesLabel}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={[
            styles.summaryStat,
            styles.summaryStatButton,
            { borderColor },
            activeMetric === 'followers' && [styles.summaryStatActive, { borderColor: activeAccent }],
          ]}
          onPress={() => handleMetricSelect('followers')}
        >
          <ThemedText
            style={[
              styles.summaryStatValue,
              activeMetric === 'followers' && { color: activeAccent },
            ]}
          >
            {formatNumber(newFollowers, locale)}
          </ThemedText>
          <ThemedText style={[styles.summaryStatLabel, { color: textSecondary }]}>
            {newFollowersLabel}
          </ThemedText>
        </TouchableOpacity>
        <View style={styles.summaryStat}>
          <ThemedText style={styles.summaryStatValue}>{formatNumber(totalFollowers, locale)}</ThemedText>
          <ThemedText style={[styles.summaryStatLabel, { color: textSecondary }]}>{totalFollowersLabel}</ThemedText>
        </View>
      </View>

      <Modal
        visible={isPeriodPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={handlePeriodClose}
      >
        <TouchableWithoutFeedback onPress={handlePeriodClose}>
          <View style={styles.periodModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.periodModal, { backgroundColor }]}> 
                {periodOptions.map((option) => {
                  const isActive = option.value === activePeriod;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      accessibilityRole="button"
                      style={[
                        styles.periodOption,
                        isActive && [styles.periodOptionActive, { borderColor: activeAccent }],
                      ]}
                      onPress={() => handlePeriodSelect(option.value)}
                    >
                      <ThemedText
                        style={[
                          styles.periodOptionText,
                          isActive && { color: activeAccent },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ThemedView>
  );
}

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
  const tabBackground = useThemeColor({}, 'background');
  const { t, currentLocale } = useTranslation();
  const { isLargeScreen } = useResponsive();
  const listRef = useRef<VirtualizedListHandle<NotificationsListItem>>(null);
  const [activeTab, setActiveTab] = useState<NotificationsTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'notes' | 'followers'>('notes');
  const [selectedPeriod, setSelectedPeriod] = useState<ActivityPeriod>('week');
  const { data: currentAccount } = useCurrentAccount();
  const { data: profile } = useProfile(currentAccount?.handle);

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

  React.useEffect(() => {
    tabScrollRegistry.register('notifications', scrollToTop);
  }, [scrollToTop]);

  React.useEffect(() => {
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
      return groupedNotifications.filter(
        (notification) => notification.type === 'reply' || notification.type === 'quote',
      );
    }

    return groupedNotifications;
  }, [activeTab, groupedNotifications]);

  const handleNotificationPress = useCallback((notification: GroupedNotification) => {
    if (notification.type === 'follow') {
      router.push(`/profile/${encodeURIComponent(notification.authors[0].handle)}`);
    } else if (notification.subject) {
      router.push(`/post/${encodeURIComponent(notification.subject)}`);
    } else {
      router.push(`/profile/${encodeURIComponent(notification.authors[0].handle)}`);
    }
  }, []);

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

  const periodOptions = useMemo(
    () => [
      { value: 'day' as ActivityPeriod, label: t('notifications.activityPeriodDay') },
      { value: 'week' as ActivityPeriod, label: t('notifications.activityPeriodWeek') },
      { value: 'month' as ActivityPeriod, label: t('notifications.activityPeriodMonth') },
      { value: 'year' as ActivityPeriod, label: t('notifications.activityPeriodYear') },
      { value: 'forever' as ActivityPeriod, label: t('notifications.activityPeriodForever') },
    ],
    [t],
  );

  const periodLabel = useMemo(() => {
    const match = periodOptions.find((option) => option.value === selectedPeriod);
    return match?.label ?? periodOptions[0]?.label ?? '';
  }, [periodOptions, selectedPeriod]);

  const {
    data: activityData,
    isLoading: isActivityLoading,
    refetch: refetchActivity,
  } = useActivityInsights(selectedPeriod);

  const activityPoints = useMemo(() => {
    if (!activityData?.points) {
      return [] as ActivitySummaryPoint[];
    }

    const formatter = new Intl.DateTimeFormat(currentLocale, {
      month: 'short',
      day: 'numeric',
    });

    return activityData.points.map((point) => ({
      ...point,
      label: formatter.format(new Date(point.dateKey)),
    }));
  }, [activityData?.points, currentLocale]);

  const totalFollowersCount = profile?.followersCount ?? activityData?.totalFollowers ?? 0;

  const activitySummary = useMemo(
    () => ({
      points: activityPoints,
      totalNotes: activityData?.totalNotes ?? 0,
      newFollowers: activityData?.newFollowers ?? 0,
      totalFollowers: totalFollowersCount,
    }),
    [activityData?.newFollowers, activityData?.totalNotes, activityPoints, totalFollowersCount],
  );

  const listData = useMemo<NotificationsListItem[]>(
    () => [
      { kind: 'tabs' } as NotificationsListItem,
      ...filteredNotifications.map((notification) => ({ kind: 'notification', notification })),
    ],
    [filteredNotifications],
  );

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <ThemedText style={styles.emptyStateTitle}>{t('notifications.noNotificationsYet')}</ThemedText>
      <ThemedText style={styles.emptyStateSubtitle}>{t('notifications.notificationsWillAppearHere')}</ThemedText>
    </View>
  ), [t]);

  const renderErrorState = useCallback(() => (
    <View style={styles.emptyState}>
      <ThemedText style={styles.emptyStateTitle}>{t('notifications.errorLoadingNotifications')}</ThemedText>
      <ThemedText style={styles.emptyStateSubtitle}>{error?.message || t('notifications.somethingWentWrong')}</ThemedText>
    </View>
  ), [error?.message, t]);

  const emptyContent = useMemo(() => {
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
    if (!isFetchingNextPage || filteredNotifications.length === 0) {
      return null;
    }

    return (
      <ThemedView style={styles.loadingMore}>
        <ThemedText style={styles.loadingMoreText}>{t('notifications.loadingMoreNotifications')}</ThemedText>
      </ThemedView>
    );
  }, [filteredNotifications.length, isFetchingNextPage, t]);

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || filteredNotifications.length === 0) {
      return;
    }

    fetchNextPage();
  }, [fetchNextPage, filteredNotifications.length, hasNextPage, isFetchingNextPage]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchActivity()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchActivity]);

  const listHeaderComponent = useCallback(
    () => (
      <ThemedView
        style={[
          styles.headerContainer,
          { paddingTop: isLargeScreen ? 0 : insets.top },
        ]}
      >
        <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
          <ThemedText style={styles.title}>{t('navigation.notifications')}</ThemedText>
        </ThemedView>
        <ActivitySummary
          points={activitySummary.points}
          totalNotes={activitySummary.totalNotes}
          newFollowers={activitySummary.newFollowers}
          totalFollowers={activitySummary.totalFollowers}
          locale={currentLocale}
          title={t('notifications.activitySummaryTitle')}
          notesLabel={t('notifications.activityNotes')}
          newFollowersLabel={t('notifications.activityNewFollowers')}
          totalFollowersLabel={t('notifications.activityTotalFollowers')}
          periodLabel={periodLabel}
          periodOptions={periodOptions}
          onSelectPeriod={setSelectedPeriod}
          activePeriod={selectedPeriod}
          activeMetric={selectedMetric}
          onSelectMetric={setSelectedMetric}
          isLoading={isActivityLoading}
          loadingLabel={t('common.loading')}
          emptyLabel={t('notifications.noNotificationsYet')}
          periodA11yLabel={t('notifications.activitySelectPeriod')}
        />
      </ThemedView>
    ),
    [
      activitySummary,
      borderColor,
      currentLocale,
      insets.top,
      isActivityLoading,
      isLargeScreen,
      periodLabel,
      periodOptions,
      selectedMetric,
      selectedPeriod,
      t,
    ],
  );

  const keyExtractor = useCallback((item: NotificationsListItem) => {
    if (item.kind === 'tabs') {
      return 'tabs';
    }

    return item.notification.id;
  }, []);

  const renderListItem = useCallback(
    ({ item }: { item: NotificationsListItem }) => {
      if (item.kind === 'tabs') {
        return (
          <ThemedView
            style={[
              styles.tabBarContainer,
              { borderBottomColor: borderColor, backgroundColor: tabBackground },
            ]}
          >
            <TabBar tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
            {filteredNotifications.length === 0 ? emptyContent : null}
          </ThemedView>
        );
      }

      return renderNotificationItem(item.notification);
    },
    [
      activeTab,
      borderColor,
      emptyContent,
      filteredNotifications.length,
      handleTabChange,
      renderNotificationItem,
      tabBackground,
      tabs,
    ],
  );

  if (isError) {
    return <ThemedView style={[styles.container, { paddingTop: insets.top }]}>{renderErrorState()}</ThemedView>;
  }

  return (
    <ThemedView style={styles.container}>
      <VirtualizedList
        ref={listRef}
        data={listData}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={160}
        overscan={2}
        ListFooterComponent={listFooterComponent ?? undefined}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        ListHeaderComponent={listHeaderComponent}
        stickyHeaderIndices={[0]}
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
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  graphContainer: {
    position: 'relative',
    marginTop: 8,
    marginBottom: 8,
    height: 160,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  graphGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  graphGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(124, 140, 249, 0.2)',
  },
  graphValueLabel: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '600',
  },
  graphDateLabel: {
    position: 'absolute',
    bottom: 8,
    fontSize: 12,
    opacity: 0.7,
  },
  graphEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphEmptyStateText: {
    fontSize: 13,
    textAlign: 'center',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryStat: {
    flex: 1,
  },
  summaryStatButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryStatActive: {
    borderWidth: 2,
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryStatLabel: {
    marginTop: 4,
    fontSize: 13,
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
  tabBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  periodModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  periodModal: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  periodOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  periodOptionActive: {
    borderWidth: 2,
  },
  periodOptionText: {
    fontSize: 15,
    fontWeight: '500',
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
