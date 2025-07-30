import { router } from 'expo-router';
import React, { useRef } from 'react';
import { FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ConversationSkeleton } from '@/components/skeletons';
import { useConversations } from '@/hooks/queries/useConversations';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useTranslation } from '@/hooks/useTranslation';
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

export default function MessagesScreen() {
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
    tabScrollRegistry.register('messages', scrollToTop);
  }, []);

  const {
    data: conversationsData,
    isLoading: conversationsLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversations();

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { borderBottomColor: borderColor }]}
      onPress={() => {
        // Navigate to conversation detail within the messages tab
        router.push(`/(tabs)/messages/${encodeURIComponent(item.handle)}`);
      }}
    >
      <ThemedView style={styles.conversationContent}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => {
            // Navigate to profile when avatar is clicked
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
  );

  const renderFooter = () => {
    if (isFetchingNextPage) {
      return (
        <ThemedView style={styles.loadingFooter}>
          <ThemedText style={styles.loadingText}>{t('common.loading')}...</ThemedText>
        </ThemedView>
      );
    }
    return null;
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>{t('common.messages')}</ThemedText>
      </ThemedView>

      <FlatList
        ref={flatListRef}
        data={conversationsData?.pages.flatMap((page) => page.conversations) ?? []}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.conversationsContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
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
