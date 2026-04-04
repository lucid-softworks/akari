import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons';
import { useAuthorReplies } from '@/hooks/queries/useAuthorReplies';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToPost } from '@/utils/navigation';
import { formatRelativeTime } from '@/utils/timeUtils';
import type { ProfileTabContentProps } from '@/components/profile/types';

type RepliesTabProps = ProfileTabContentProps & {
  handle: string;
};

export function RepliesTab({ handle, visibleCount = 10 }: RepliesTabProps) {
  const { t } = useTranslation();
  const { data: replies, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuthorReplies(handle);
  const navigateToPost = useNavigateToPost();

  // Fetch more pages when visible count approaches data length
  useEffect(() => {
    if (replies && visibleCount >= replies.length - 3 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [visibleCount, replies?.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filteredReplies = useMemo(
    () => (replies ?? []).filter((item) => item && item.uri),
    [replies],
  );

  if (isLoading) {
    return <FeedSkeleton count={3} />;
  }

  if (filteredReplies.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noReplies')}</ThemedText>
      </ThemedView>
    );
  }

  const visibleReplies = filteredReplies.slice(0, visibleCount);

  return (
    <View>
      {visibleReplies.map((item) => {
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
      })}
    </View>
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
});
