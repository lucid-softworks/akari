import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BlueskyBookmark } from '@/bluesky-api';
import { EmptyState } from '@/components/EmptyState';
import { PostCard } from '@/components/PostCard';
import { UnavailableRecord } from '@/components/RecordEmbed/UnavailableRecord';
import { FeedSkeleton } from '@/components/skeletons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { UnavailableWithoutAppView } from '@/components/UnavailableWithoutAppView';
import { VirtualizedList, type VirtualizedListHandle } from '@/components/ui/VirtualizedList';
import { spacing } from '@/constants/tokens';
import { webScreenContainer } from '@/constants/webStyles';
import { useBookmarks } from '@/hooks/queries/useBookmarks';
import { useMutedWords } from '@/hooks/queries/useMutedWords';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { useTranslation } from '@/hooks/useTranslation';
import { isAppViewRequiredError } from '@/utils/appView';
import { isPostMuted } from '@/utils/mutedWordsFilter';
import { useNavigateToPost } from '@/utils/navigation';
import { tabScrollRegistry } from '@/utils/tabScrollRegistry';
import { formatRelativeTime } from '@/utils/timeUtils';

// app.bsky.bookmark.getBookmarks can return items in three shapes — a full
// post view, a notFoundPost stub (the original post was deleted), or a
// blockedPost stub (the viewer can't see it). Only the first variant has
// `author` and the rest of the post fields, so we have to branch before
// rendering. The lexicon tags each variant with `$type`, but we fall back
// to a structural author check so unexpected shapes don't crash either.
type BookmarkItemView = BlueskyBookmark['item'] & {
  $type?: string;
  notFound?: boolean;
  blocked?: boolean;
};

function bookmarkUnavailableKind(item: BookmarkItemView): 'notFound' | 'blocked' | null {
  const type = item.$type;
  if (type === 'app.bsky.feed.defs#notFoundPost' || item.notFound) return 'notFound';
  if (type === 'app.bsky.feed.defs#blockedPost' || item.blocked) return 'blocked';
  if (!item.author) return 'notFound';
  return null;
}

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

  const appViewEnabled = useAppViewEnabled();
  // 50 = AppView's default page size; matches bsky.app and avoids two
  // small initial round-trips when the user has more than ~20 bookmarks.
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useBookmarks(50);
  const { data: mutedWords } = useMutedWords();

  const rawBookmarks = data?.pages.flatMap((page) => page.bookmarks) ?? [];
  // Muted-word filtering reads post.author.did, so skip unavailable items
  // (deleted / blocked) before they hit the filter. They still render below
  // as an UnavailableRecord placeholder so the user can see and remove them.
  const bookmarks = mutedWords.length
    ? rawBookmarks.filter((b) => {
        if (bookmarkUnavailableKind(b.item as BookmarkItemView)) return true;
        return !isPostMuted(b.item, mutedWords);
      })
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
    const post = item.item as BookmarkItemView;

    // Deleted or blocked bookmarks come back without the post fields a
    // PostCard expects. Render a placeholder instead of crashing on a
    // missing author reference.
    const unavailable = bookmarkUnavailableKind(post);
    if (unavailable) {
      return (
        <View style={styles.unavailableWrapper}>
          <UnavailableRecord kind={unavailable} handleLabel={null} blockingMessage={null} />
        </View>
      );
    }

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
            labels: post.author.labels,
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
          threadRootUri: (post.record as { reply?: { root?: { uri?: string } } }).reply?.root?.uri,
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

  if (!appViewEnabled || isAppViewRequiredError(error)) {
    return (
      <ThemedView style={[Platform.OS === 'web' ? webScreenContainer : styles.container, { paddingTop: insets.top }]}>
        <UnavailableWithoutAppView feature={t('common.bookmarks')} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[Platform.OS === 'web' ? webScreenContainer : styles.container, { paddingTop: insets.top }]}>
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
  unavailableWrapper: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
