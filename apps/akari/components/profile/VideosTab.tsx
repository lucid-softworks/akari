import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedSkeleton } from '@/components/skeletons';
import { useAuthorVideos } from '@/hooks/queries/useAuthorVideos';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToPost } from '@/utils/navigation';
import { formatRelativeTime } from '@/utils/timeUtils';
import type { ProfileTabContentProps } from '@/components/profile/types';

type VideosTabProps = ProfileTabContentProps & {
  handle: string;
};

export function VideosTab({ handle, visibleCount = 10 }: VideosTabProps) {
  const { t } = useTranslation();
  const { data: videos, isLoading } = useAuthorVideos(handle);
  const navigateToPost = useNavigateToPost();

  const filteredVideos = useMemo(
    () => (videos ?? []).filter((item) => item && item.uri),
    [videos],
  );

  if (isLoading) {
    return <FeedSkeleton count={3} />;
  }

  if (filteredVideos.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>{t('profile.noVideos')}</ThemedText>
      </ThemedView>
    );
  }

  const visibleVideos = filteredVideos.slice(0, visibleCount);

  return (
    <View>
      {visibleVideos.map((item) => {
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
