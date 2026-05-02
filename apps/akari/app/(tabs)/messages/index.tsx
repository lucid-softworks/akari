import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ConversationSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { useConversations } from '@/hooks/queries/useConversations';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import en from '@/translations/en.json';
import { useNavigateToProfile } from '@/utils/navigation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { Image } from 'expo-image';
import { useResponsive } from '@/hooks/useResponsive';
import { spacing, radius, fontSize, fontWeight, opacity, layout, activeOpacity } from '@/constants/tokens';

type ConvoMember = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
};

type Conversation = {
  id: string;
  convoId: string;
  handle: string;
  displayName: string;
  avatar?: string;
  members: ConvoMember[];
  isGroup: boolean;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  status: 'request' | 'accepted';
  muted: boolean;
};

type CommonTranslationKey = keyof typeof en.translations.common;
type CommonTranslationPath = `common.${CommonTranslationKey}`;

type PendingButtonConfig = {
  labelKey: CommonTranslationPath;
  onPress: () => void;
};

const ESTIMATED_CONVERSATION_HEIGHT = 88;

type MessagesListScreenProps = {
  status?: 'request' | 'accepted';
  titleKey: CommonTranslationPath;
  pendingButtonConfig?: PendingButtonConfig;
  tabRegistryKey?: string;
  onBackPress?: () => void;
};

export function MessagesListScreen({
  status = 'accepted',
  titleKey,
  pendingButtonConfig,
  tabRegistryKey = 'messages',
  onBackPress,
}: MessagesListScreenProps) {
  const insets = useSafeAreaInsets();
  const borderColor = useBorderColor();
  const tintColor = useThemeColor({}, 'tint');
  const flatListRef = React.useRef<VirtualizedListHandle<Conversation>>(null);
  const { t } = useTranslation();
  const navigateToProfile = useNavigateToProfile();
  const { isLargeScreen } = useResponsive();

  const scrollToTop = React.useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  React.useEffect(() => {
    tabScrollRegistry.register(tabRegistryKey, scrollToTop);
  }, [scrollToTop, tabRegistryKey]);

  const {
    data: conversationsData,
    isLoading: conversationsLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useConversations(50, undefined, status);

  const conversations = React.useMemo(() => {
    const flattened = conversationsData?.pages.flatMap((page) => page.conversations) ?? [];
    return flattened.filter((conversation) => conversation.status === status);
  }, [conversationsData, status]);

  // Fetch pending conversations separately for preview avatars (only when showing accepted list)
  const pendingStatus = status === 'accepted' ? 'request' : 'accepted';
  const { data: pendingData } = useConversations(5, undefined, pendingStatus);

  const previewAvatars = React.useMemo(
    () => {
      const pendingConvos = pendingData?.pages.flatMap((page) => page.conversations) ?? [];
      const unique = new Set<string>();
      const avatars: { key: string; uri?: string; fallback: string }[] = [];

      for (const conversation of pendingConvos) {
        if (unique.has(conversation.id)) continue;
        unique.add(conversation.id);
        const fallback = (conversation.displayName || conversation.handle || 'U').charAt(0).toUpperCase();
        avatars.push({ key: conversation.id, uri: conversation.avatar, fallback });
        if (avatars.length === 5) break;
      }

      return avatars;
    },
    [pendingData],
  );

  // Track only user-initiated refreshes so background refetches (e.g. on
  // back-navigation when the query is stale) don't flash the pull-to-refresh
  // spinner over the list.
  const [userRefreshing, setUserRefreshing] = React.useState(false);
  const handleRefresh = React.useCallback(async () => {
    setUserRefreshing(true);
    try {
      await refetch({ throwOnError: false });
    } finally {
      setUserRefreshing(false);
    }
  }, [refetch]);

  const renderConversation = React.useCallback(
    ({ item }: { item: Conversation }) => {
      const isDeleted = item.handle === 'missing.invalid';
      const displayName = item.isGroup
        ? item.members
            .map((m) => m.displayName || m.handle || t('messages.deletedAccount'))
            .join(', ')
        : isDeleted
        ? t('messages.deletedAccount')
        : item.displayName;
      return (
      <TouchableOpacity
        style={[styles.conversationItem, { borderBottomColor: borderColor }]}
        onPress={() => {
          router.push(
            `/(tabs)/messages/${encodeURIComponent(item.handle)}?convoId=${encodeURIComponent(item.convoId)}` as any,
          );
        }}
      >
        <ThemedView style={styles.conversationContent}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => {
              if (isDeleted || item.isGroup) return;
              navigateToProfile({ actor: item.handle });
            }}
            activeOpacity={activeOpacity.default}
          >
            {item.isGroup ? (
              <View style={styles.groupAvatar}>
                {item.members.slice(0, 3).map((member, idx) => (
                  <ThemedView
                    key={member.did}
                    style={[
                      styles.groupAvatarSlot,
                      { borderColor },
                      idx > 0 && styles.groupAvatarSlotOverlap,
                    ]}
                  >
                    {member.avatar ? (
                      <Image source={{ uri: member.avatar }} style={styles.groupAvatarImage} contentFit="cover" />
                    ) : (
                      <ThemedText style={styles.groupAvatarFallback}>
                        {(member.displayName || member.handle || 'U')[0].toUpperCase()}
                      </ThemedText>
                    )}
                  </ThemedView>
                ))}
              </View>
            ) : item.avatar ? (
              <ThemedView style={styles.avatar}>
                <Image source={{ uri: item.avatar }} style={styles.avatarImage} contentFit="cover" />
              </ThemedView>
            ) : (
              <ThemedView style={styles.avatar}>
                <ThemedText style={styles.avatarFallback}>{(displayName || 'U')[0].toUpperCase()}</ThemedText>
              </ThemedView>
            )}
          </TouchableOpacity>

          <ThemedView style={styles.conversationInfo}>
            <ThemedView style={styles.conversationHeader}>
              <ThemedText style={[styles.displayName, item.unreadCount > 0 && styles.displayNameUnread]}>
                {displayName}
              </ThemedText>
              <ThemedText style={styles.timestamp}>{item.timestamp}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.conversationFooter}>
              <ThemedText
                style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
                numberOfLines={1}
              >
                {item.lastMessage}
              </ThemedText>
              {item.unreadCount > 0 && (
                <ThemedView style={styles.unreadBadge}>
                  <ThemedText style={styles.unreadCount}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</ThemedText>
                </ThemedView>
              )}
            </ThemedView>
            {item.status === 'request' && (
              <ThemedView style={styles.statusBadge}>
                <ThemedText style={styles.statusText}>{t('common.pending')}</ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </ThemedView>
      </TouchableOpacity>
    );
    },
    [borderColor, navigateToProfile, t],
  );

  const renderFooter = React.useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <ThemedView style={styles.loadingFooter}>
          <ThemedText style={styles.loadingText}>{t('common.loading')}...</ThemedText>
        </ThemedView>
      );
    }

    return null;
  }, [isFetchingNextPage, t]);

  const handleLoadMore = React.useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const listHeaderComponent = React.useCallback(
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
            <ThemedView style={styles.headerTitleContainer}> 
              {onBackPress ? ( 
                <TouchableOpacity style={styles.backButton} onPress={onBackPress} activeOpacity={activeOpacity.default}> 
                  <IconSymbol name="chevron.left" size={24} color="#007AFF" /> 
                </TouchableOpacity> 
              ) : null} 
              <ThemedText style={styles.title}>{t(titleKey)}</ThemedText> 
            </ThemedView> 
            <View style={styles.headerActions}>
              {pendingButtonConfig ? (
                <>
                  <TouchableOpacity style={styles.pendingButton} onPress={pendingButtonConfig.onPress} activeOpacity={activeOpacity.default}>
                    <ThemedText style={styles.pendingButtonText}>{t(pendingButtonConfig.labelKey)}</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.newChatButton}
                    onPress={() => router.push('/(tabs)/messages/new' as any)}
                    accessibilityLabel={t('messages.newChat')}
                    activeOpacity={activeOpacity.default}
                  >
                    <IconSymbol name="square.and.pencil" size={22} color={tintColor} />
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </ThemedView>
        ) : pendingButtonConfig ? (
          <ThemedView style={[styles.mobileToolbar, { borderBottomColor: borderColor }]}>
            <View style={styles.mobileToolbarAvatars}>
              {previewAvatars.map((avatar, index) => (
                <ThemedView
                  key={avatar.key}
                  style={[
                    styles.mobileAvatar,
                    { borderColor },
                    index > 0 && styles.mobileAvatarOverlap,
                  ]}
                >
                  {avatar.uri ? (
                    <Image source={{ uri: avatar.uri }} style={styles.mobileAvatarImage} contentFit="cover" />
                  ) : (
                    <ThemedText style={styles.mobileAvatarFallback}>{avatar.fallback}</ThemedText>
                  )}
                </ThemedView>
              ))}
            </View>
            <View style={styles.headerActions}>
              {pendingButtonConfig ? (
                <>
                  <TouchableOpacity
                    style={styles.mobilePendingButton}
                    onPress={pendingButtonConfig.onPress}
                    activeOpacity={activeOpacity.default}
                  >
                    <ThemedText style={styles.mobilePendingButtonText}>{t(pendingButtonConfig.labelKey)}</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.newChatButton}
                    onPress={() => router.push('/(tabs)/messages/new' as any)}
                    accessibilityLabel={t('messages.newChat')}
                    activeOpacity={activeOpacity.default}
                  >
                    <IconSymbol name="square.and.pencil" size={22} color={tintColor} />
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </ThemedView>
        ) : null}
      </ThemedView>
    ),
    [
      borderColor,
      insets.top,
      isLargeScreen,
      onBackPress,
      pendingButtonConfig,
      previewAvatars,
      t,
      titleKey,
    ],
  );

  return (
    <ThemedView style={styles.container}>
      <VirtualizedList
        ref={flatListRef}
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.conversationsContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        overscan={2}
        estimatedItemSize={ESTIMATED_CONVERSATION_HEIGHT}
        refreshing={userRefreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          conversationsLoading && !conversationsData ? (
            <ThemedView style={styles.skeletonContainer}>
              {Array.from({ length: 10 }).map((_, index) => (
                <ConversationSkeleton key={index} />
              ))}
            </ThemedView>
          ) : error ? (
            <EmptyState
              title={t('common.errorLoadingConversations')}
              action={{ label: t('common.tryAgain'), onPress: () => void refetch({ throwOnError: false }) }}
            />
          ) : (
            <EmptyState title={t('common.noConversations')} />
          )
        }
        ListHeaderComponent={listHeaderComponent}
      />
    </ThemedView>
  );
}

export default function MessagesScreen() {
  const handleNavigateToPending = React.useCallback(() => {
    router.push('/(tabs)/messages/pending');
  }, []);

  return (
    <MessagesListScreen
      titleKey="common.messages"
      pendingButtonConfig={{
        labelKey: 'common.viewPendingChats',
        onPress: handleNavigateToPending,
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingHorizontal: 0,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  mobileToolbarAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mobileAvatar: {
    width: layout.avatarSmall,
    height: layout.avatarSmall,
    borderRadius: layout.avatarSmall / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderWidth: 2,
  },
  mobileAvatarOverlap: {
    marginLeft: -spacing.sm,
  },
  mobileAvatarImage: {
    width: layout.avatarSmall,
    height: layout.avatarSmall,
  },
  mobileAvatarFallback: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: spacing.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  pendingButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.lg,
  },
  pendingButtonText: {
    color: 'white',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  mobilePendingButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.lg,
  },
  mobilePendingButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  newChatButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationsContent: {
    paddingBottom: layout.tabBarPadding,
  },
  conversationItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: 'white',
  },
  groupAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 50,
    height: 50,
  },
  groupAvatarSlot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
  },
  groupAvatarSlotOverlap: {
    marginLeft: -spacing.md,
  },
  groupAvatarImage: {
    width: '100%',
    height: '100%',
  },
  groupAvatarFallback: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  displayName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  displayNameUnread: {
    fontWeight: fontWeight.bold,
  },
  timestamp: {
    fontSize: fontSize.sm,
    opacity: opacity.tertiary,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  lastMessageUnread: {
    opacity: 1,
    fontWeight: fontWeight.medium,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: 'white',
  },
  statusBadge: {
    backgroundColor: '#FF9500',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: 'white',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingFooter: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  errorTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  errorSubtitle: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorHelp: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  skeletonContainer: {
    flex: 1,
    paddingBottom: layout.tabBarPadding,
  },
  emptyTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.lg,
    opacity: opacity.tertiary,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  errorLoadingConversations: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  noConversations: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
});
