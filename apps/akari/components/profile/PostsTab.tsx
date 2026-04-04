import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';

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
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function PostsTab({ handle, ListHeaderComponent, onRefresh, refreshing }: PostsTabProps) {
  const { t } = useTranslation();
  const { data: posts, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuthorPosts(handle);
  const navigateToPost = useNavigateToPost();

  const filteredPosts = useMemo(
    () => (posts ?? []).filter((item) => item && item.uri),
    [posts],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(({ item }: { item: any }) => {
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
        onPress={() => {
          const uriParts = item.uri.split('/');
          const rKey = uriParts[uriParts.length - 1];
          navigateToPost({ actor: item.author.handle, rKey });
        }}
      />
    );
  }, [navigateToPost]);

  if (isLoading && !filteredPosts.length) {
    return (
      <>
        {ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent) : null}
        <FeedSkeleton count={3} />
      </>
    );
  }

  if (filteredPosts.length === 0) {
    return (
      <>
        {ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent) : null}
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>{t('profile.noPosts')}</ThemedText>
        </ThemedView>
      </>
    );
  }

  return (
    <FlatList
      data={filteredPosts}
      renderItem={renderItem}
      keyExtractor={(item: any) => `${item.uri}-${item.indexedAt}`}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.3}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      onRefresh={onRefresh}
      refreshing={refreshing}
      contentContainerStyle={styles.listContent}
      removeClippedSubviews
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
});
