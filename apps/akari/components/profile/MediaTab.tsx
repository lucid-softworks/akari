import { Image } from '@/components/Image';
import { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ProfileTabFlatList } from '@/components/profile/ProfileTabFlatList';
import { useProfileTabRefresh } from '@/components/profile/useProfileTabRefresh';
import { activeOpacity, layout, radius, spacing } from '@/constants/tokens';
import { useAuthorMedia } from '@/hooks/queries/useAuthorMedia';
import { useMutedFilter } from '@/hooks/useMutedFilter';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useNavigateToPost } from '@/utils/navigation';
import type { ProfileTabContentProps } from '@/components/profile/types';

type MediaTabProps = ProfileTabContentProps & {
  handle: string;
};

type MediaPost = {
  uri: string;
  cid?: string;
  indexedAt?: string;
  author: { handle: string };
  embed?: any;
};

type MediaRow = { __row: true; key: string; left: MediaPost; right?: MediaPost };

/**
 * Pull the first thumbnail URL from a post's embed. Walks the common shapes:
 * `app.bsky.embed.images#view`, `app.bsky.embed.video#view`, and
 * `app.bsky.embed.recordWithMedia#view` (whose `media` slot is one of the
 * above). Returns `null` for posts whose embed didn't survive into a known
 * media-bearing shape — those just render as a placeholder tile.
 */
function getMediaThumb(post: MediaPost): string | null {
  const embed = post.embed as
    | { $type?: string; images?: { thumb?: string }[]; thumbnail?: string; media?: any }
    | undefined;
  if (!embed) return null;

  const images = embed.images;
  if (Array.isArray(images) && images[0]?.thumb) return images[0].thumb;
  if (typeof embed.thumbnail === 'string') return embed.thumbnail;

  const media = embed.media as { images?: { thumb?: string }[]; thumbnail?: string } | undefined;
  if (media) {
    if (Array.isArray(media.images) && media.images[0]?.thumb) return media.images[0].thumb;
    if (typeof media.thumbnail === 'string') return media.thumbnail;
  }

  return null;
}

export function MediaTab({
  handle,
  ListHeaderComponent,
  StickyTabComponent,
  pinScrollY,
  isActive,
  onProfileRefresh,
  onScrollY,
  onHeaderHeightChange,
}: MediaTabProps) {
  const { t } = useTranslation();
  const { data: media, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useAuthorMedia(handle);
  const handleRefresh = useProfileTabRefresh(refetch, onProfileRefresh);
  const navigateToPost = useNavigateToPost();
  const tileBg = useThemeColor({ light: '#f3f4f6', dark: '#1f2326' }, 'background');

  const mutedMedia = useMutedFilter(media);
  const filteredMedia = useMemo(
    () => mutedMedia.filter((item): item is MediaPost => Boolean(item && item.uri)),
    [mutedMedia],
  );

  // Bucket the flat media list into pairs so each rendered row holds two
  // tiles. We don't use FlatList's `numColumns` because ProfileTabFlatList
  // injects header/skeleton/empty rows into the same data stream, and
  // those need to span the full width — pairing at this layer keeps
  // those special rows untouched.
  const rows = useMemo<MediaRow[]>(() => {
    const out: MediaRow[] = [];
    for (let i = 0; i < filteredMedia.length; i += 2) {
      const left = filteredMedia[i];
      const right = filteredMedia[i + 1];
      out.push({ __row: true, key: `${left.uri}|${right?.uri ?? '∅'}`, left, right });
    }
    return out;
  }, [filteredMedia]);

  const handleTilePress = useCallback(
    (post: MediaPost) => {
      const parts = post.uri.split('/');
      const rKey = parts[parts.length - 1];
      navigateToPost({ actor: post.author.handle, rKey });
    },
    [navigateToPost],
  );

  const renderTile = useCallback(
    (post: MediaPost | undefined) => {
      if (!post) {
        // Placeholder so the trailing odd row's left tile keeps half-width.
        return <View style={[styles.tile, styles.tilePlaceholder]} />;
      }
      const thumb = getMediaThumb(post);
      return (
        <TouchableOpacity
          style={[styles.tile, { backgroundColor: tileBg }]}
          onPress={() => handleTilePress(post)}
          activeOpacity={activeOpacity.subtle}
          accessibilityRole="button"
          accessibilityLabel={`Open post ${post.uri}`}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.tileImage} contentFit="cover" />
          ) : null}
        </TouchableOpacity>
      );
    },
    [handleTilePress, tileBg],
  );

  const renderItem = useCallback(
    (row: MediaRow) => (
      <View style={styles.row}>
        {renderTile(row.left)}
        {renderTile(row.right)}
      </View>
    ),
    [renderTile],
  );

  return (
    <ProfileTabFlatList
      data={rows}
      renderItem={renderItem}
      keyExtractor={(row: MediaRow) => row.key}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      ListHeaderComponent={ListHeaderComponent}
      StickyTabComponent={StickyTabComponent}
      emptyText={t('profile.noMedia')}
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
  row: {
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xxs,
    marginBottom: spacing.xxs,
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.xs,
    overflow: 'hidden',
    borderWidth: layout.border,
    borderColor: 'transparent',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tilePlaceholder: {
    backgroundColor: 'transparent',
  },
});
