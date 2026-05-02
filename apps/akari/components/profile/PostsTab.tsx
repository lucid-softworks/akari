import { useCallback, useMemo } from 'react';

import { PostCard } from '@/components/PostCard';
import { ProfileTabFlatList } from '@/components/profile/ProfileTabFlatList';
import { useAuthorPosts } from '@/hooks/queries/useAuthorPosts';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToPost } from '@/utils/navigation';
import { formatRelativeTime } from '@/utils/timeUtils';
import type { ProfileTabContentProps } from '@/components/profile/types';

type PostsTabProps = ProfileTabContentProps & {
  handle: string;
};

export function PostsTab({
  handle,
  ListHeaderComponent,
  StickyTabComponent,
  pinTabsOnMount,
  onRefresh,
  refreshing,
}: PostsTabProps) {
  const { t } = useTranslation();
  const { data: posts, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuthorPosts(handle);
  const navigateToPost = useNavigateToPost();

  const filteredPosts = useMemo(
    () => (posts ?? []).filter((item) => item && item.uri),
    [posts],
  );

  const renderItem = useCallback(
    (item: any) => {
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
    },
    [navigateToPost],
  );

  return (
    <ProfileTabFlatList
      data={filteredPosts}
      renderItem={renderItem}
      keyExtractor={(item: any) => `${item.uri}-${item.indexedAt}`}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      ListHeaderComponent={ListHeaderComponent}
      StickyTabComponent={StickyTabComponent}
      emptyText={t('profile.noPosts')}
      pinTabsOnMount={pinTabsOnMount}
      onRefresh={onRefresh}
      refreshing={refreshing}
    />
  );
}
