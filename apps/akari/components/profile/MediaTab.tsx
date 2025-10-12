import { useTabNavigation } from '@/hooks/useTabNavigation';
import { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useAuthorMedia } from '@/hooks/queries/useAuthorMedia';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';

type MediaTabProps = {
  handle: string;
};

const ESTIMATED_MEDIA_POST_CARD_HEIGHT = 360;

export function MediaTab({ handle }: MediaTabProps) {
  const { t } = useTranslation();
  const { navigateToPost } = useTabNavigation();
  const { data: media, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuthorMedia(handle);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const filteredMedia = useMemo(() => (media ?? []).filter((item) => item && item.uri), [media]);

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
          navigateToPost(item.uri, item.author.handle);
        }}
      />
    );
  };

  const footer = useMemo(() => {
    if (!isFetchingNextPage) return null;
    return (
      <ThemedView style={styles.loadingFooter}>
        <ThemedText style={styles.loadingText}>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }, [isFetchingNextPage, t]);

  if (isLoading) {
    return <FeedSkeleton count={3} />;
  }

  if (filteredMedia.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noMedia')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <VirtualizedList
      data={filteredMedia}
      renderItem={renderItem}
      keyExtractor={(item) => `${item.uri}-${item.indexedAt}`}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      ListFooterComponent={footer}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      estimatedItemSize={ESTIMATED_MEDIA_POST_CARD_HEIGHT}
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
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
