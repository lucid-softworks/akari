import { Image } from '@/components/Image';
import { Stack } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { buildGrainPhotoBlobUrl } from '@/bluesky-api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { type LightboxImage } from '@/components/ui/Lightbox';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { webColumnSideBorders, webScreenContainer } from '@/constants/webStyles';
import {
  groupGalleryItems,
  indexGrainExifByPhotoUri,
  indexGrainPhotosByUri,
  useGrainGalleries,
  useGrainGalleryItems,
  useGrainPhotoExif,
  useGrainPhotos,
} from '@/hooks/queries/useGrainGalleries';
import type { GrainPhotoExifRecord } from '@/bluesky-api';
import type { LightboxExif } from '@/components/ui/LightboxInfoPanel';
import { usePdsUrl } from '@/hooks/queries/usePdsUrl';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useLightbox } from '@/hooks/useLightbox';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type GalleryViewProps = {
  /** Handle or DID of the gallery owner. */
  actor: string;
  /** Record key of the `social.grain.gallery` record. */
  rkey: string;
};

/** grain stores EXIF numeric fields scaled by 1e6; decode for display. */
function decodeGrainExif(record: GrainPhotoExifRecord | undefined): LightboxExif | undefined {
  if (!record) return undefined;
  const v = record.value;
  const exif: LightboxExif = {
    make: v.make,
    model: v.model,
    lensModel: v.lensModel,
    fNumber: v.fNumber !== undefined ? v.fNumber / 1e6 : undefined,
    exposureTime: v.exposureTime !== undefined ? v.exposureTime / 1e6 : undefined,
    iso: v.iSO !== undefined ? v.iSO / 1e6 : undefined,
    focalLength35mm:
      v.focalLengthIn35mmFormat !== undefined ? v.focalLengthIn35mmFormat / 1e6 : undefined,
    dateTimeOriginal: v.dateTimeOriginal,
    flash: v.flash,
  };
  const hasAny = Object.values(exif).some((x) => x !== undefined);
  return hasAny ? exif : undefined;
}

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
  const { data: exifRecords } = useGrainPhotoExif(actor);

  const gallery = useMemo(
    () => galleries?.find((g) => g.uri.endsWith(`/${rkey}`)) ?? null,
    [galleries, rkey],
  );

  const photoIndex = useMemo(() => indexGrainPhotosByUri(photos), [photos]);
  const itemsByGallery = useMemo(() => groupGalleryItems(items), [items]);
  const exifIndex = useMemo(() => indexGrainExifByPhotoUri(exifRecords), [exifRecords]);

  const galleryPhotos = useMemo(() => {
    if (!gallery) return [];
    const bucket = itemsByGallery.get(gallery.uri) ?? [];
    const resolved: NonNullable<ReturnType<typeof photoIndex.get>>[] = [];
    for (const item of bucket) {
      const photo = photoIndex.get(item.value.item);
      if (photo) resolved.push(photo);
    }
    return resolved;
  }, [gallery, itemsByGallery, photoIndex]);

  // Resolve all photo blob URLs once so the lightbox can hand the full
  // set to the pager and the grid tiles share the same resolution
  // logic. Skips photos whose blob ref doesn't resolve to a PDS URL.
  const lightboxImages = useMemo<LightboxImage[]>(() => {
    if (!pdsUrl) return [];
    const out: LightboxImage[] = [];
    for (const photo of galleryPhotos) {
      const photoDid = photo.uri.split('/')[2];
      if (!photoDid) continue;
      const ar = photo.value.aspectRatio;
      out.push({
        url: buildGrainPhotoBlobUrl(pdsUrl, photoDid, photo.value.photo.ref.$link),
        alt: photo.value.alt,
        width: ar?.width,
        height: ar?.height,
        sizeBytes: photo.value.photo.size,
        mimeType: photo.value.photo.mimeType,
        exif: decodeGrainExif(exifIndex.get(photo.uri)),
      });
    }
    return out;
  }, [galleryPhotos, pdsUrl, exifIndex]);

  const openLightbox = useLightbox();
  const openAt = useCallback((index: number) => openLightbox(lightboxImages, index), [openLightbox, lightboxImages]);

  const title = gallery?.value.title;
  const description = gallery?.value.description;

  return (
    <ThemedView style={Platform.OS === 'web' ? webScreenContainer : styles.container}>
      {title ? <Stack.Screen options={{ title }} /> : null}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.header,
            { borderBottomColor: borderColor },
            webColumnSideBorders(borderColor),
          ]}
        >
          <ThemedText style={styles.title}>{title ?? ''}</ThemedText>
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
            {galleryPhotos.map((photo, idx) => {
              const photoDid = photo.uri.split('/')[2];
              const url = pdsUrl && photoDid
                ? buildGrainPhotoBlobUrl(pdsUrl, photoDid, photo.value.photo.ref.$link)
                : null;
              const ar = photo.value.aspectRatio;
              const aspect = ar.width > 0 && ar.height > 0 ? ar.width / ar.height : 1;
              return (
                <Pressable
                  key={photo.uri}
                  onPress={url ? () => openAt(idx) : undefined}
                  accessibilityRole={url ? 'button' : undefined}
                  accessibilityLabel={photo.value.alt}
                  style={({ pressed }) => [
                    styles.tile,
                    { aspectRatio: aspect },
                    pressed && url ? { opacity: activeOpacity.default } : null,
                  ]}
                >
                  {url ? (
                    <Image
                      source={{ uri: url }}
                      style={styles.tileImage}
                      contentFit="cover"
                      accessibilityLabel={photo.value.alt}
                    />
                  ) : null}
                </Pressable>
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
