import { Image } from '@/components/Image';
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { buildGrainPhotoBlobUrl, type GrainGalleryRecord } from '@/bluesky-api';
import { ProfileTabFlatList } from '@/components/profile/ProfileTabFlatList';
import { useProfileTabRefresh } from '@/components/profile/useProfileTabRefresh';
import { ThemedText } from '@/components/ThemedText';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import {
  groupGalleryItems,
  indexGrainPhotosByUri,
  useGrainGalleries,
  useGrainGalleryItems,
  useGrainPhotos,
} from '@/hooks/queries/useGrainGalleries';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProfileTabContentProps } from '@/components/profile/types';

type PhotosTabProps = ProfileTabContentProps & {
  handle: string;
};

type GalleryRow = {
  __row: true;
  key: string;
  left: GalleryTileData;
  right?: GalleryTileData;
};

type GalleryTileData = {
  gallery: GrainGalleryRecord;
  coverUrl: string | null;
  photoCount: number;
};

type GalleryTileProps = {
  tile: GalleryTileData | undefined;
  tileBg: string;
  onPress: (tile: GalleryTileData) => void;
  secondaryColor: string;
};

function GalleryTile({ tile, tileBg, onPress, secondaryColor }: GalleryTileProps) {
  if (!tile) {
    return <View style={[styles.tile, styles.tilePlaceholder]} />;
  }
  const title = tile.gallery.value.title;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: tileBg },
        pressed && { opacity: activeOpacity.subtle },
      ]}
      onPress={() => onPress(tile)}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {tile.coverUrl ? (
        <Image source={{ uri: tile.coverUrl }} style={styles.tileImage} contentFit="cover" />
      ) : null}
      <View style={styles.tileOverlay}>
        <ThemedText style={styles.tileTitle} numberOfLines={2}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.tileMeta, { color: secondaryColor }]}>
          {tile.photoCount > 0 ? String(tile.photoCount) : '—'}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function PhotosTab({
  handle,
  ListHeaderComponent,
  StickyTabComponent,
  pinScrollY,
  isActive,
  onProfileRefresh,
  onScrollY,
  onHeaderHeightChange,
}: PhotosTabProps) {
  const { t } = useTranslation();
  const tileBg = useThemeColor({ light: '#f3f4f6', dark: '#1f2326' }, 'background');
  const overlaySecondary = useThemeColor({ light: '#FFFFFFCC', dark: '#FFFFFFAA' }, 'text');

  const { data: pdsUrl } = usePdsUrl(handle);
  const {
    data: galleries,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useGrainGalleries(handle);
  const { data: items } = useGrainGalleryItems(handle);
  const { data: photos } = useGrainPhotos(handle);
  const handleRefresh = useProfileTabRefresh(refetch, onProfileRefresh);

  const photoIndex = useMemo(() => indexGrainPhotosByUri(photos), [photos]);
  const itemsByGallery = useMemo(() => groupGalleryItems(items), [items]);

  const tiles = useMemo<GalleryTileData[]>(() => {
    if (!galleries) return [];
    return galleries.map((gallery): GalleryTileData => {
      const bucket = itemsByGallery.get(gallery.uri) ?? [];
      let coverUrl: string | null = null;
      for (const item of bucket) {
        const photo = photoIndex.get(item.value.item);
        if (!photo || !pdsUrl) continue;
        const photoDid = photo.uri.split('/')[2];
        if (!photoDid) continue;
        coverUrl = buildGrainPhotoBlobUrl(pdsUrl, photoDid, photo.value.photo.ref.$link);
        break;
      }
      return { gallery, coverUrl, photoCount: bucket.length };
    });
  }, [galleries, itemsByGallery, photoIndex, pdsUrl]);

  const rows = useMemo<GalleryRow[]>(() => {
    const out: GalleryRow[] = [];
    for (let i = 0; i < tiles.length; i += 2) {
      const left = tiles[i];
      const right = tiles[i + 1];
      out.push({ __row: true, key: `${left.gallery.uri}|${right?.gallery.uri ?? '∅'}`, left, right });
    }
    return out;
  }, [tiles]);

  const handleTilePress = useCallback(
    (tile: GalleryTileData) => {
      const parts = tile.gallery.uri.split('/');
      const rkey = parts[parts.length - 1];
      router.push(`/(tabs)/profile/${handle}/gallery/${rkey}`);
    },
    [handle],
  );

  const renderItem = useCallback(
    (row: GalleryRow) => (
      <View style={styles.row}>
        <GalleryTile tile={row.left} tileBg={tileBg} onPress={handleTilePress} secondaryColor={overlaySecondary} />
        <GalleryTile tile={row.right} tileBg={tileBg} onPress={handleTilePress} secondaryColor={overlaySecondary} />
      </View>
    ),
    [handleTilePress, tileBg, overlaySecondary],
  );

  return (
    <ProfileTabFlatList
      data={rows}
      renderItem={renderItem}
      keyExtractor={(row: GalleryRow) => row.key}
      isLoading={isLoading}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      ListHeaderComponent={ListHeaderComponent}
      StickyTabComponent={StickyTabComponent}
      emptyText={t('profile.noPhotos')}
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
  tileOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tileTitle: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  tileMeta: {
    fontSize: fontSize.xs,
  },
});
