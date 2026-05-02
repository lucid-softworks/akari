import { useCallback, useMemo } from 'react';

import { PostCard } from '@/components/PostCard';
import { ProfileTabFlatList } from '@/components/profile/ProfileTabFlatList';
import { useProfileTabRefresh } from '@/components/profile/useProfileTabRefresh';
import { useAuthorReplies } from '@/hooks/queries/useAuthorReplies';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToPost } from '@/utils/navigation';
import { formatRelativeTime } from '@/utils/timeUtils';
import type { ProfileTabContentProps } from '@/components/profile/types';

type RepliesTabProps = ProfileTabContentProps & {
  handle: string;
};

export function RepliesTab({
  handle,
  ListHeaderComponent,
  StickyTabComponent,
  pinScrollY,
  isActive,
  onProfileRefresh,
  onScrollY,
  onHeaderHeightChange,
}: RepliesTabProps) {
  const { t } = useTranslation();
  const { data: replies, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useAuthorReplies(handle);
  const navigateToPost = useNavigateToPost();
  const handleRefresh = useProfileTabRefresh(refetch, onProfileRefresh);

  const filteredReplies = useMemo(
    () => (replies ?? []).filter((item) => item && item.uri),
    [replies],
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
      data={filteredReplies}
      renderItem={renderItem}
      keyExtractor={(item: any) => `${item.uri}-${item.indexedAt}`}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      ListHeaderComponent={ListHeaderComponent}
      StickyTabComponent={StickyTabComponent}
      emptyText={t('profile.noReplies')}
      pinScrollY={pinScrollY}
      isActive={isActive}
      onRefresh={handleRefresh}
      refreshing={isRefetching}
    onScrollY={onScrollY}
    onHeaderHeightChange={onHeaderHeightChange}
    />
  );
}
