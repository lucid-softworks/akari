import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PostCard } from '@/components/PostCard';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ProfileTabFlatList } from '@/components/profile/ProfileTabFlatList';
import { useProfileTabRefresh } from '@/components/profile/useProfileTabRefresh';
import { spacing, fontSize, fontWeight, opacity } from '@/constants/tokens';
import { webColumnSideBorders } from '@/constants/webStyles';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useAuthorPosts } from '@/hooks/queries/useAuthorPosts';
import { usePinnedPost } from '@/hooks/queries/usePinnedPost';
import { useProfile } from '@/hooks/queries/useProfile';
import { useMutedFilter } from '@/hooks/useMutedFilter';
import { useThemeColor } from '@/hooks/useThemeColor';
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
  pinScrollY,
  isActive,
  onProfileRefresh,
  onScrollY,
  onHeaderHeightChange,
}: PostsTabProps) {
  const { t } = useTranslation();
  const {
    data: posts,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useAuthorPosts(handle);
  const { data: profile } = useProfile(handle);
  const { data: pinnedPost } = usePinnedPost(profile?.pinnedPost?.uri);
  const navigateToPost = useNavigateToPost();
  const handleRefresh = useProfileTabRefresh(refetch, onProfileRefresh);
  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const borderColor = useBorderColor();

  const mutedPosts = useMutedFilter(posts);
  const filteredPosts = useMemo(() => {
    const regular = mutedPosts.filter((item) => item && item.uri);
    // Skip the pinned post if it would otherwise duplicate inside the feed.
    const dedup = pinnedPost
      ? regular.filter((p) => p.uri !== pinnedPost.uri)
      : regular;
    return pinnedPost ? [{ ...pinnedPost, _isPinned: true } as any, ...dedup] : dedup;
  }, [mutedPosts, pinnedPost]);

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

      const card = (
        <PostCard
          post={{
            id: item.uri,
            text: item.record?.text as string | undefined,
            author: {
              did: item.author.did,
              handle: item.author.handle,
              displayName: item.author.displayName,
              avatar: item.author.avatar,
              verification: item.author.verification,
              labels: item.author.labels,
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
            threadRootUri: (item.record as { reply?: { root?: { uri?: string } } }).reply?.root?.uri,
          }}
          href={`/profile/${item.author.handle}/post/${item.uri.split('/').pop()}`}
          onPress={() => {
            const uriParts = item.uri.split('/');
            const rKey = uriParts[uriParts.length - 1];
            navigateToPost({ actor: item.author.handle, rKey });
          }}
        />
      );

      if (item._isPinned) {
        return (
          <View>
            <View style={[styles.pinnedBadge, webColumnSideBorders(borderColor)]}>
              <IconSymbol name="pin.fill" size={12} color={iconColor} />
              <ThemedText style={[styles.pinnedBadgeText, { color: iconColor }]}>
                {t('post.pinned')}
              </ThemedText>
            </View>
            {card}
          </View>
        );
      }

      return card;
    },
    [navigateToPost, iconColor, t, borderColor],
  );

  return (
    <ProfileTabFlatList
      data={filteredPosts}
      renderItem={renderItem}
      keyExtractor={(item: any) =>
        item._isPinned ? `pinned-${item.uri}` : `${item.uri}-${item.indexedAt}`
      }
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      ListHeaderComponent={ListHeaderComponent}
      StickyTabComponent={StickyTabComponent}
      emptyText={t('profile.noPosts')}
      pinScrollY={pinScrollY}
      isActive={isActive}
      onRefresh={handleRefresh}
      refreshing={isRefetching}
    onScrollY={onScrollY}
    onHeaderHeightChange={onHeaderHeightChange}
    />
  );
}

const styles = StyleSheet.create({
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  pinnedBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: opacity.secondary,
  },
});
