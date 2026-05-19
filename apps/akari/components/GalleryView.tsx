import { Image } from '@/components/Image';
import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { buildGrainPhotoBlobUrl } from '@/bluesky-api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
import {
  groupGalleryItems,
  indexGrainPhotosByUri,
  useGrainGalleries,
  useGrainGalleryItems,
  useGrainPhotos,
} from '@/hooks/queries/useGrainGalleries';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type GalleryViewProps = {
  /** Handle or DID of the gallery owner. */
  actor: string;
  /** Record key of the `social.grain.gallery` record. */
  rkey: string;
};

/**
 * Read-only renderer for one grain.social gallery. Pulls the gallery
 * record, the membership records, and the photo records from the
 * owner's PDS, then renders title + description + photo grid. Blob
 * URLs are PDS-direct (no AppView dependency).
 */
export function GalleryView({ actor, rkey }: GalleryViewProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');

  const { data: pdsUrl } = usePdsUrl(actor);
  const { data: galleries } = useGrainGalleries(actor);
  const { data: items } = useGrainGalleryItems(actor);
  const { data: photos } = useGrainPhotos(actor);

  const gallery = useMemo(
    () => galleries?.find((g) => g.uri.endsWith(`/${rkey}`)) ?? null,
    [galleries, rkey],
  );

  const photoIndex = useMemo(() => indexGrainPhotosByUri(photos), [photos]);
  const itemsByGallery = useMemo(() => groupGalleryItems(items), [items]);

  const galleryPhotos = useMemo(() => {
    if (!gallery) return [];
    const bucket = itemsByGallery.get(gallery.uri) ?? [];
    return bucket
      .map((item) => photoIndex.get(item.value.item))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [gallery, itemsByGallery, photoIndex]);

  const title = gallery?.value.title ?? '';
  const description = gallery?.value.description;

  return (
    <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.header,
            { borderBottomColor: borderColor },
            webColumnSideBorders(borderColor),
          ]}
        >
          <ThemedText style={styles.title}>{title}</ThemedText>
          {description ? (
            <ThemedText style={[styles.description, { color: secondary }]}>{description}</ThemedText>
          ) : null}
        </View>

        {galleryPhotos.length === 0 ? (
          <ThemedText style={[styles.placeholder, { color: secondary }]}>
            {t('profile.noPhotos')}
          </ThemedText>
        ) : (
          <View style={[styles.grid, webColumnSideBorders(borderColor)]}>
            {galleryPhotos.map((photo) => {
              const photoDid = photo.uri.split('/')[2];
              const url = pdsUrl && photoDid
                ? buildGrainPhotoBlobUrl(pdsUrl, photoDid, photo.value.photo.ref.$link)
                : null;
              const ar = photo.value.aspectRatio;
              const aspect = ar.width > 0 && ar.height > 0 ? ar.width / ar.height : 1;
              return (
                <View key={photo.uri} style={[styles.tile, { aspectRatio: aspect }]}>
                  {url ? (
                    <Image
                      source={{ uri: url }}
                      style={styles.tileImage}
                      contentFit="cover"
                      accessibilityLabel={photo.value.alt}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: layout.hairline,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  placeholder: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  grid: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  tile: {
    width: '100%',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
});
