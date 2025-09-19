import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BlueskyBookmark } from '@/bluesky-api';
import { PostCard } from '@/components/PostCard';
import { FeedSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBookmarks } from '@/hooks/queries/useBookmarks';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { formatRelativeTime } from '@/utils/timeUtils';

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const flatListRef = useRef<FlatList<BlueskyBookmark>>(null);
  const refreshTintColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  useEffect(() => {
    tabScrollRegistry.register('bookmarks', scrollToTop);
  }, []);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useBookmarks(20);

  const bookmarks = data?.pages.flatMap((page) => page.bookmarks) ?? [];

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const renderBookmark = ({ item }: { item: BlueskyBookmark }) => {
    const post = item.item;

    const replyTo = post.reply?.parent
      ? {
          author: {
            handle: post.reply.parent.author?.handle || t('common.unknown'),
            displayName: post.reply.parent.author?.displayName,
          },
          text: (post.reply.parent.record as { text?: string } | undefined)?.text,
        }
      : undefined;

    return (
      <View style={styles.postCardContainer}>
        <PostCard
          post={{
            id: post.uri,
            text: (post.record as { text?: string } | undefined)?.text,
            author: {
              handle: post.author.handle,
              displayName: post.author.displayName,
              avatar: post.author.avatar,
            },
            createdAt: formatRelativeTime(post.indexedAt),
            likeCount: post.likeCount || 0,
            commentCount: post.replyCount || 0,
            repostCount: post.repostCount || 0,
            embed: post.embed,
            embeds: post.embeds,
            labels: post.labels,
            viewer: post.viewer,
            facets: (post.record as any)?.facets,
            replyTo,
            uri: post.uri,
            cid: post.cid,
          }}
          onPress={() => {
            router.push(`/post/${encodeURIComponent(post.uri)}`);
          }}
        />
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        ref={flatListRef}
        data={bookmarks}
        keyExtractor={(item) => `${item.subject.uri}-${item.createdAt}`}
        renderItem={renderBookmark}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          bookmarks.length === 0 ? styles.emptyListContent : null,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={refreshTintColor}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <ThemedView style={styles.header}>
            <ThemedText style={styles.title}>{t('common.bookmarks')}</ThemedText>
            <ThemedText style={styles.subtitle}>{t('bookmarks.subtitle')}</ThemedText>
          </ThemedView>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ThemedView style={styles.loadingMore}>
              <ThemedText style={styles.loadingMoreText}>{t('feed.loadingMorePosts')}</ThemedText>
            </ThemedView>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonContainer}>
              <FeedSkeleton count={4} />
            </View>
          ) : error ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>{t('bookmarks.error')}</ThemedText>
            </ThemedView>
          ) : (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>{t('bookmarks.emptyState')}</ThemedText>
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
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  postCardContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    opacity: 0.6,
  },
  skeletonContainer: {
    paddingHorizontal: 24,
  },
});
