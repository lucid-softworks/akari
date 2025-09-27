import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { ConversationSkeleton } from '@/components/skeletons';
import { useConversations } from '@/hooks/queries/useConversations';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';
import en from '@/translations/en.json';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { Image } from 'expo-image';

type Conversation = {
  id: string;
  handle: string;
  displayName: string;
  avatar?: string;
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
  const flatListRef = React.useRef<VirtualizedListHandle<Conversation>>(null);
  const { t } = useTranslation();

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
    isRefetching,
  } = useConversations(50, undefined, status);

  const conversations = React.useMemo(() => {
    const flattened = conversationsData?.pages.flatMap((page) => page.conversations) ?? [];

    return flattened.filter((conversation) => conversation.status === status);
  }, [conversationsData, status]);

  const handleRefresh = React.useCallback(async () => {
    await refetch({ throwOnError: false });
  }, [refetch]);

  const renderConversation = React.useCallback(
    ({ item }: { item: Conversation }) => (
      <TouchableOpacity
        style={[styles.conversationItem, { borderBottomColor: borderColor }]}
        onPress={() => {
          router.push(`/(tabs)/messages/${encodeURIComponent(item.handle)}`);
        }}
      >
        <ThemedView style={styles.conversationContent}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => {
              router.push(`/profile/${encodeURIComponent(item.handle)}`);
            }}
            activeOpacity={0.7}
          >
            {item.avatar ? (
              <ThemedView style={styles.avatar}>
                <Image source={{ uri: item.avatar }} style={styles.avatarImage} contentFit="cover" />
              </ThemedView>
            ) : (
              <ThemedView style={styles.avatar}>
                <ThemedText style={styles.avatarFallback}>{item.displayName[0].toUpperCase()}</ThemedText>
              </ThemedView>
            )}
          </TouchableOpacity>

          <ThemedView style={styles.conversationInfo}>
            <ThemedView style={styles.conversationHeader}>
              <ThemedText style={styles.displayName}>{item.displayName}</ThemedText>
              <ThemedText style={styles.timestamp}>{item.timestamp}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.conversationFooter}>
              <ThemedText style={styles.lastMessage} numberOfLines={1}>
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
    ),
    [borderColor, t],
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
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerTitleContainer}>
          {onBackPress ? (
            <TouchableOpacity style={styles.backButton} onPress={onBackPress} activeOpacity={0.7}>
              <IconSymbol name="chevron.left" size={24} color="#007AFF" />
            </TouchableOpacity>
          ) : null}
          <ThemedText style={styles.title}>{t(titleKey)}</ThemedText>
        </ThemedView>
        {pendingButtonConfig ? (
          <TouchableOpacity
            style={styles.pendingButton}
            onPress={pendingButtonConfig.onPress}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.pendingButtonText}>{t(pendingButtonConfig.labelKey)}</ThemedText>
          </TouchableOpacity>
        ) : null}
      </ThemedView>

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
        refreshing={isRefetching}
        onRefresh={handleRefresh}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          conversationsLoading ? (
            <ThemedView style={styles.skeletonContainer}>
              {Array.from({ length: 10 }).map((_, index) => (
                <ConversationSkeleton key={index} />
              ))}
            </ThemedView>
          ) : error ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>{t('common.errorLoadingConversations')}</ThemedText>
            </ThemedView>
          ) : (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>{t('common.noConversations')}</ThemedText>
            </ThemedView>
          )
        }
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  pendingButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pendingButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    opacity: 0.7,
    flex: 1,
    marginRight: 8,
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
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  statusBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.6,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorHelp: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  skeletonContainer: {
    flex: 1,
    paddingBottom: 100, // Account for tab bar
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorLoadingConversations: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  noConversations: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
});
