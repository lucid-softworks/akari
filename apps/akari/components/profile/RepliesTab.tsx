import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons';
import { useAuthorReplies } from '@/hooks/queries/useAuthorReplies';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';

type RepliesTabProps = {
  handle: string;
};

const ESTIMATED_POST_CARD_HEIGHT = 320;

export function RepliesTab({ handle }: RepliesTabProps) {
  const { t } = useTranslation();
  const { data: replies, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuthorReplies(handle);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderItem = ({ item }: { item: any }) => {
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
          router.push(`/post/${encodeURIComponent(item.uri)}`);
        }}
      />
    );
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <ThemedView style={styles.loadingFooter}>
        <ThemedText style={styles.loadingText}>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  };

  if (isLoading) {
    return <FeedSkeleton count={3} />;
  }

  if (!replies || replies.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noReplies')}</ThemedText>
      </ThemedView>
    );
  }

  const filteredReplies = replies.filter((item) => item && item.uri);

  return (
    <VirtualizedList
      data={filteredReplies}
      renderItem={renderItem}
      keyExtractor={(item) => `${item.uri}-${item.indexedAt}`}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      ListFooterComponent={renderFooter}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      style={styles.flatList}
      estimatedItemSize={ESTIMATED_POST_CARD_HEIGHT}
      accessibilityRole="list"
      accessible
    />
  );
}

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
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
