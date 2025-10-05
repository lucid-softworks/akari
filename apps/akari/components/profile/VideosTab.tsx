import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons';
import { useAuthorVideos } from '@/hooks/queries/useAuthorVideos';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';

type VideosTabProps = {
  handle: string;
};

const ESTIMATED_VIDEO_POST_CARD_HEIGHT = 360;

export function VideosTab({ handle }: VideosTabProps) {
  const { t } = useTranslation();
  const { data: videos, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuthorVideos(handle);

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
          router.push(`/(tabs)/profile/post/${encodeURIComponent(item.uri)}`);
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

  if (!videos || videos.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noVideos')}</ThemedText>
      </ThemedView>
    );
  }

  const filteredVideos = videos.filter((item) => item && item.uri);

  return (
    <VirtualizedList
      data={filteredVideos}
      renderItem={renderItem}
      keyExtractor={(item) => `${item.uri}-${item.indexedAt}`}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.1}
      ListFooterComponent={renderFooter}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      estimatedItemSize={ESTIMATED_VIDEO_POST_CARD_HEIGHT}
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
