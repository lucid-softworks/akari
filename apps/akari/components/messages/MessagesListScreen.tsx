import React, { use } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabChromeContext } from '@/app/(tabs)/_layout';
import { EmptyState } from '@/components/EmptyState';
import { ConversationSkeleton } from '@/components/skeletons';
import { ThemedView } from '@/components/ThemedView';
import { UnavailableWithoutAppView } from '@/components/UnavailableWithoutAppView';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { ConversationRow } from '@/components/messages/ConversationRow';
import { MessagesListFooter } from '@/components/messages/MessagesListFooter';
import { MessagesListHeader } from '@/components/messages/MessagesListHeader';
import type { CommonTranslationPath, Conversation, PendingButtonConfig } from '@/components/messages/types';
import { layout, spacing, zIndex } from '@/constants/tokens';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
import { useConversations } from '@/hooks/queries/useConversations';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useMessagesSettings } from '@/hooks/useMessagesSettings';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { isAppViewRequiredError } from '@/utils/appView';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';

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
  // Opaque background for the sticky header strip on web — without
  // this the header is transparent, so the rows scrolling underneath
  // bleed through and read as if they're going *over* the header.
  const surfaceBackground = useThemeColor({}, 'background');
  const flatListRef = React.useRef<VirtualizedListHandle<Conversation>>(null);
  const { t } = useTranslation();
  const { isLargeScreen } = useResponsive();
  const appViewEnabled = useAppViewEnabled();
  const isWeb = Platform.OS === 'web';
  const { topInset: chromeTopInset } = use(TabChromeContext);
  const { hideDeletedAccounts } = useMessagesSettings();

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
    return flattened.filter((conversation) => {
      if (conversation.status !== status) return false;
      // ConversationRow flags a row as deleted when its primary handle
      // resolves to `missing.invalid`. Group chats keep showing even
      // when individual members are deleted.
      if (hideDeletedAccounts && !conversation.isGroup && conversation.handle === 'missing.invalid') {
        return false;
      }
      return true;
    });
  }, [conversationsData, hideDeletedAccounts, status]);

  // Fetch pending conversations separately for preview avatars (only when showing accepted list)
  const pendingStatus = status === 'accepted' ? 'request' : 'accepted';
  const { data: pendingData } = useConversations(5, undefined, pendingStatus);

  const previewAvatars = React.useMemo(() => {
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
  }, [pendingData]);

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
    ({ item }: { item: Conversation }) => <ConversationRow conversation={item} borderColor={borderColor} />,
    [borderColor],
  );

  const renderFooter = React.useCallback(
    () => (isFetchingNextPage ? <MessagesListFooter /> : null),
    [isFetchingNextPage],
  );

  const handleLoadMore = React.useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const listHeaderComponent = React.useCallback(
    () => (
      <MessagesListHeader
        titleKey={titleKey}
        isLargeScreen={isLargeScreen}
        insetTop={insets.top}
        borderColor={borderColor}
        tintColor={tintColor}
        pendingButtonConfig={pendingButtonConfig}
        previewAvatars={previewAvatars}
        onBackPress={onBackPress}
      />
    ),
    [
      borderColor,
      insets.top,
      isLargeScreen,
      onBackPress,
      pendingButtonConfig,
      previewAvatars,
      tintColor,
      titleKey,
    ],
  );

  const rootStyle = isWeb
    ? [webScreenContainer, webColumnSideBorders(borderColor)]
    : styles.container;

  if (!appViewEnabled || isAppViewRequiredError(error)) {
    return (
      <ThemedView style={rootStyle}>
        <UnavailableWithoutAppView feature={t(titleKey)} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={rootStyle}>
      {isWeb ? (
        <View
          style={
            ({
              position: 'sticky',
              top: chromeTopInset,
              zIndex: zIndex.sticky,
              backgroundColor: surfaceBackground,
            } as object)
          }
        >
          {listHeaderComponent()}
        </View>
      ) : null}
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
                // oxlint-disable-next-line react-doctor/no-array-index-as-key -- placeholder skeletons; fixed-length [0..9] with no identity beyond position
                <ConversationSkeleton key={`conversation-skeleton-${index}`} />
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
        ListHeaderComponent={isWeb ? undefined : listHeaderComponent}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  conversationsContent: {
    paddingBottom: layout.tabBarPadding,
  },
  skeletonContainer: {
    flex: 1,
    paddingBottom: layout.tabBarPadding,
    paddingHorizontal: spacing.lg,
  },
});
