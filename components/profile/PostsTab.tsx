import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons';
import { useAuthorPosts } from '@/hooks/queries/useAuthorPosts';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';

type PostsTabProps = {
  handle: string;
};

export function PostsTab({ handle }: PostsTabProps) {
  const { t } = useTranslation();
  const { data: posts, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuthorPosts(handle);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (isLoading) {
    return <FeedSkeleton count={3} />;
  }

  if (!posts || posts.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noPosts')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollViewContent}
      showsVerticalScrollIndicator={false}
      onScroll={(event) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const paddingToBottom = 20;
        if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
          handleLoadMore();
        }
      }}
      scrollEventThrottle={400}
    >
      {posts
        .filter((item) => item && item.uri)
        .map((item) => {
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
              key={`${item.uri}-${item.indexedAt}`}
              post={{
                id: item.uri,
                text: item.record?.text as string | undefined,
                author: {
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
              }}
              onPress={() => {
                router.push(`/post/${encodeURIComponent(item.uri)}`);
              }}
            />
          );
        })}

      {/* Loading indicator for infinite scroll */}
      {isFetchingNextPage && (
        <ThemedView style={styles.loadingFooter}>
          <ThemedText style={styles.loadingText}>{t('common.loading')}</ThemedText>
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
