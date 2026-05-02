import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons';
import { useAuthorPosts } from '@/hooks/queries/useAuthorPosts';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToPost } from '@/utils/navigation';
import { formatRelativeTime } from '@/utils/timeUtils';

type PostsTabProps = {
  handle: string;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  /** Rendered between header and posts, sticks to the top when scrolled */
  StickyTabComponent?: React.ReactElement | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  listRef?: React.Ref<FlatList<any>>;
};

export function PostsTab({ handle, ListHeaderComponent, StickyTabComponent, onRefresh, refreshing, listRef }: PostsTabProps) {
  const { t } = useTranslation();
  const { data: posts, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuthorPosts(handle);
  const navigateToPost = useNavigateToPost();

  const filteredPosts = useMemo(
    () => (posts ?? []).filter((item) => item && item.uri),
    [posts],
  );

  const hasHeader = !!ListHeaderComponent;
  const hasStickyTab = !!StickyTabComponent;
  const headerCount = (hasHeader ? 1 : 0) + (hasStickyTab ? 1 : 0);

  const listData = useMemo(() => {
    const prefix: any[] = [];
    if (hasHeader) prefix.push({ __type: 'header' });
    if (hasStickyTab) prefix.push({ __type: 'stickyTab' });
    return [...prefix, ...filteredPosts];
  }, [filteredPosts, hasHeader, hasStickyTab]);

  const stickyIndices = useMemo(
    () => (hasStickyTab ? [hasHeader ? 1 : 0] : undefined),
    [hasHeader, hasStickyTab],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.__type === 'header') {
      return ListHeaderComponent
        ? typeof ListHeaderComponent === 'function'
          ? <ListHeaderComponent />
          : ListHeaderComponent
        : null;
    }
    if (item.__type === 'stickyTab') {
      return StickyTabComponent ?? null;
    }

    const replyTo = item.reply?.parent
      ? {
          author: {
            handle: item.reply.parent.author?.handle || 'unknown',
            displayName: item.reply.parent.author?.displayName,
          },
          text: item.reply.parent.record?.text as string | undefined,
        }
      : undefined;

    return (
      <PostCard
        post={{
          id: item.uri,
          text: item.record?.text as string | undefined,
          author: {
            did: item.author.did,
            handle: item.author.handle,
            displayName: item.author.displayName,
            avatar: item.author.avatar,
          },
          createdAt: formatRelativeTime(item.indexedAt),
          likeCount: item.likeCount || 0,
          commentCount: item.replyCount || 0,
          repostCount: item.repostCount || 0,
          embed: item.embed,
          embeds: item.embeds,
          labels: item.labels,
          viewer: item.viewer,
          facets: (item.record as any)?.facets,
          replyTo,
          uri: item.uri,
          cid: item.cid,
        }}
        href={`/profile/${item.author.handle}/post/${item.uri.split('/').pop()}`}
        onPress={() => {
          const uriParts = item.uri.split('/');
          const rKey = uriParts[uriParts.length - 1];
          navigateToPost({ actor: item.author.handle, rKey });
        }}
      />
    );
  }, [navigateToPost]);

  const renderHeader = () => ListHeaderComponent
    ? typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent
    : null;

  if (isLoading && !filteredPosts.length) {
    return (
      <>
        {renderHeader()}
        {StickyTabComponent}
        <FeedSkeleton count={3} />
      </>
    );
  }

  if (filteredPosts.length === 0) {
    return (
      <>
        {renderHeader()}
        {StickyTabComponent}
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>{t('profile.noPosts')}</ThemedText>
        </ThemedView>
      </>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={listData}
      renderItem={renderItem}
      keyExtractor={(item: any) => item.__type ?? `${item.uri}-${item.indexedAt}`}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.3}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={stickyIndices}
      stickyHeaderHiddenOnScroll
      onRefresh={onRefresh}
      refreshing={refreshing}
      contentContainerStyle={styles.listContent}
      removeClippedSubviews={false}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.loadingFooter} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  listContent: {
    paddingBottom: 100,
  },
  loadingFooter: {
    paddingVertical: 20,
  },
});
