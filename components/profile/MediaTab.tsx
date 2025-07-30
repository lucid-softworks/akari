import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons';
import { useAuthorMedia } from '@/hooks/queries/useAuthorMedia';
import { useTranslation } from '@/hooks/useTranslation';
import { formatRelativeTime } from '@/utils/timeUtils';

type MediaTabProps = {
  handle: string;
};

export function MediaTab({ handle }: MediaTabProps) {
  const { t } = useTranslation();
  const { data: media, isLoading } = useAuthorMedia(handle);

  if (isLoading) {
    return <FeedSkeleton count={3} />;
  }

  if (!media || media.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noMedia')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      {media
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
                replyTo,
              }}
              onPress={() => {
                router.push(`/post/${encodeURIComponent(item.uri)}`);
              }}
            />
          );
        })}
    </>
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
