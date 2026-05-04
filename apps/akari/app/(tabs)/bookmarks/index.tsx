import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BlueskyBookmark } from '@/bluesky-api';
import { EmptyState } from '@/components/EmptyState';
import { PostCard } from '@/components/PostCard';
import { FeedSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { useBookmarks } from '@/hooks/queries/useBookmarks';
import { useMutedWords } from '@/hooks/queries/useMutedWords';
import { useTranslation } from '@/hooks/useTranslation';
import { isPostMuted } from '@/utils/mutedWordsFilter';
import { useNavigateToPost } from '@/utils/navigation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { formatRelativeTime } from '@/utils/timeUtils';

const ESTIMATED_POST_CARD_HEIGHT = 320;

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigateToPost = useNavigateToPost();
  const flatListRef = useRef<VirtualizedListHandle<BlueskyBookmark>>(null);

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  useEffect(() => {
    tabScrollRegistry.register('bookmarks', scrollToTop);
  }, []);

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useBookmarks(20);
  const { data: mutedWords } = useMutedWords();

  const rawBookmarks = data?.pages.flatMap((page) => page.bookmarks) ?? [];
  const bookmarks = mutedWords.length
    ? rawBookmarks.filter((b) => !isPostMuted(b.item, mutedWords))
    : rawBookmarks;

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
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
      <PostCard
        post={{
          id: post.uri,
          text: (post.record as { text?: string } | undefined)?.text,
          author: {
            did: post.author.did,
            handle: post.author.handle,
            displayName: post.author.displayName,
            avatar: post.author.avatar,
            verification: post.author.verification,
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
        href={`/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`}
        onPress={() => {
          const uriParts = post.uri.split('/');
          const rKey = uriParts[uriParts.length - 1];
          navigateToPost({ actor: post.author.handle, rKey });
        }}
      />
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <VirtualizedList
        ref={flatListRef}
        data={bookmarks}
        keyExtractor={(item) => `${item.subject.uri}-${item.createdAt}`}
        renderItem={renderBookmark}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, bookmarks.length === 0 ? styles.emptyListContent : null]}
        refreshing={isRefetching}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        estimatedItemSize={ESTIMATED_POST_CARD_HEIGHT}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ThemedView style={styles.loadingMore}>
              <ThemedText style={styles.loadingMoreText}>{t('feed.loadingMorePosts')}</ThemedText>
            </ThemedView>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <FeedSkeleton count={4} />
          ) : error ? (
            <EmptyState
              title={t('bookmarks.error')}
              action={{ label: t('common.tryAgain'), onPress: () => void refetch() }}
            />
          ) : (
            <EmptyState title={t('bookmarks.emptyState')} />
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
  listContent: {
    paddingBottom: 32,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    opacity: 0.6,
  },
});
