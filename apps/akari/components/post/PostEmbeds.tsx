import { Image } from '@/components/Image';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { BlueskyEmbed, BlueskyImage } from '@/bluesky-api';
import { ExternalEmbed } from '@/components/ExternalEmbed';
import { GifEmbed } from '@/components/GifEmbed';
import { ImageViewer } from '@/components/ImageViewer';
import { RecordEmbed } from '@/components/RecordEmbed';
import { ThemedView } from '@/components/ThemedView';
import { VideoEmbed } from '@/components/VideoEmbed';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { spacing, radius, activeOpacity, layout } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

type PostEmbedsProps = {
  postId: string;
  embed?: BlueskyEmbed;
  embeds?: BlueskyEmbed[];
  translatedEmbed?: { title?: string; description?: string } | null;
};

type ExternalEmbedData = {
  $type: 'app.bsky.embed.external' | 'app.bsky.embed.external#view';
  external: {
    description: string;
    thumb?: {
      $type: 'blob';
      ref: { $link: string };
      mimeType: string;
      size: number;
    };
    title: string;
    uri: string;
  };
};

export const PostEmbeds = React.memo(function PostEmbeds({ postId, embed, embeds, translatedEmbed }: PostEmbedsProps) {
  const { t } = useTranslation();
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});

  const handleImagePress = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, []);

  const handleCloseImageViewer = useCallback(() => {
    setSelectedImageIndex(null);
  }, []);

  const handleImageLoad = useCallback((imageUrl: string, width: number, height: number) => {
    setImageDimensions((prev) => ({
      ...prev,
      [imageUrl]: { width, height },
    }));
  }, []);

  const embedData = embed || (embeds && embeds[0]);

  // Also check for additional embeds (e.g. images + external link as separate items)
  const additionalEmbeds = embeds && embeds.length > 1 ? embeds.slice(1) : [];

  const imageData = useMemo(() => {
    const empty = { urls: [] as string[], altTexts: [] as string[], ratios: [] as (number | undefined)[] };
    if (!embedData) return empty;

    const fromImages = (images: BlueskyImage[]) => {
      const filtered = images.filter(
        (img) => !img.image?.mimeType || !img.image.mimeType.startsWith('video/'),
      );
      return {
        urls: filtered.map((img) => img.fullsize).filter(Boolean),
        altTexts: filtered.map((img) => img.alt),
        ratios: filtered.map((img) =>
          img.aspectRatio && img.aspectRatio.width > 0 && img.aspectRatio.height > 0
            ? img.aspectRatio.width / img.aspectRatio.height
            : undefined,
        ),
      };
    };

    if (embedData.$type === 'app.bsky.embed.images' || embedData.$type === 'app.bsky.embed.images#view') {
      return embedData.images ? fromImages(embedData.images) : empty;
    }

    if (embedData.$type === 'app.bsky.embed.recordWithMedia#view' && embedData.media) {
      if (embedData.media.$type === 'app.bsky.embed.images#view' && embedData.media.images) {
        return fromImages(embedData.media.images);
      }
    }

    if (embedData.images) {
      return fromImages(embedData.images);
    }

    for (const extra of additionalEmbeds) {
      if (extra.$type === 'app.bsky.embed.images#view' && extra.images) {
        const result = fromImages(extra.images);
        if (result.urls.length > 0) return result;
      }
    }

    return empty;
  }, [embedData, additionalEmbeds]);

  const videoData = useMemo(() => {
    const tFn = t as (key: any) => string;
    const findVideo = (e: BlueskyEmbed | undefined | null): ReturnType<typeof extractVideo> => {
      if (!e) return null;
      const result = extractVideo(e, tFn);
      if (result) return result;
      if (e.media) {
        const mediaResult = extractVideo(e.media as unknown as BlueskyEmbed, tFn);
        if (mediaResult) return mediaResult;
      }
      return null;
    };

    const result = findVideo(embed);
    if (result) return result;

    if (embeds) {
      for (const e of embeds) {
        const r = findVideo(e);
        if (r) return r;
      }
    }

    return null;
  }, [embed, embeds, t]);

  const embedClassification = useMemo(() => {
    if (!embedData) return null;

    const uri = embedData.external?.uri || '';
    const isExtType = embedData.$type?.includes('app.bsky.embed.external');

    if (isExtType) {
      if (uri.includes('youtube.com') || uri.includes('youtu.be') || uri.includes('music.youtube.com')) {
        return 'youtube';
      }
      if (uri.includes('tenor.com') || uri.includes('media.tenor.com') || uri.endsWith('.gif')) {
        return 'gif';
      }
      const isVideoLink =
        uri.includes('vimeo.com') ||
        uri.includes('dailymotion.com') ||
        uri.includes('twitch.tv') ||
        uri.includes('tiktok.com') ||
        uri.includes('.mp4') ||
        uri.includes('.mov') ||
        uri.includes('.avi') ||
        uri.includes('.webm');
      if (isVideoLink) return 'externalVideo';
      return 'external';
    }

    if (embedData.$type === 'app.bsky.embed.record#view' && embedData.record) return 'record';
    if (embedData.$type === 'app.bsky.embed.recordWithMedia#view' && embedData.record) return 'recordWithMedia';

    return null;
  }, [embedData]);

  if (!embedData && !videoData && imageData.urls.length === 0) return null;

  return (
    <>
      {videoData && <VideoEmbed embed={videoData} onClose={handleCloseImageViewer} />}

      {!videoData && embedClassification === 'externalVideo' && embedData && (
        <VideoEmbed embed={embedData as any} />
      )}

      {embedClassification === 'youtube' && embedData && (
        <YouTubeEmbed embed={embedData as ExternalEmbedData} />
      )}

      {embedClassification === 'gif' && embedData && (
        <GifEmbed embed={embedData as ExternalEmbedData} />
      )}

      {embedClassification === 'external' && embedData && (
        <ExternalEmbed embed={embedData as ExternalEmbedData} translatedTitle={translatedEmbed?.title} translatedDescription={translatedEmbed?.description} />
      )}

      {imageData.urls.length > 0 && (
        <View
          style={[
            styles.imagesContainer,
            imageData.urls.length > 1 && styles.imagesGrid,
          ]}
        >
          {imageData.urls.map((imageUrl: string, index: number) => {
            const isGrid = imageData.urls.length > 1;
            const dimensions = imageDimensions[imageUrl];
            const aspectRatio =
              imageData.ratios[index] ??
              (dimensions ? dimensions.width / dimensions.height : undefined) ??
              4 / 3;

            return (
              <Pressable
                key={`${postId}-${imageUrl}`}
                onPress={() => handleImagePress(index)}
                
                style={({ pressed }) => [isGrid ? styles.gridCell : undefined, pressed && { opacity: activeOpacity.subtle }]}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={[
                    styles.image,
                    isGrid ? styles.gridImage : { aspectRatio },
                  ]}
                  contentFit="cover"
                  onLoad={(event) => handleImageLoad(imageUrl, event.source.width, event.source.height)}
                />
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Render additional embeds (e.g. external link when primary embed is images) */}
      {additionalEmbeds.map((extra, i) => {
        if (extra.$type?.includes('app.bsky.embed.external') && extra.external) {
          const uri = extra.external.uri || '';
          const extraKey = `extra-${i}-${uri}`;
          if (uri.includes('tenor.com') || uri.includes('media.tenor.com') || uri.endsWith('.gif')) {
            return <GifEmbed key={extraKey} embed={extra as ExternalEmbedData} />;
          }
          if (uri.includes('youtube.com') || uri.includes('youtu.be')) {
            return <YouTubeEmbed key={extraKey} embed={extra as ExternalEmbedData} />;
          }
          return <ExternalEmbed key={extraKey} embed={extra as ExternalEmbedData} />;
        }
        return null;
      })}

      {embedClassification === 'recordWithMedia' && embedData?.media && (() => {
        const media = embedData.media as any;
        const mediaUri = media?.external?.uri || '';
        const isMediaExt = media?.$type?.includes('app.bsky.embed.external');
        if (isMediaExt && (mediaUri.includes('tenor.com') || mediaUri.includes('media.tenor.com') || mediaUri.endsWith('.gif'))) {
          return <GifEmbed embed={media} />;
        }
        if (isMediaExt) {
          return <ExternalEmbed embed={media as ExternalEmbedData} />;
        }
        return null;
      })()}

      {(embedClassification === 'record' || embedClassification === 'recordWithMedia') && embedData?.record && (
        <RecordEmbed embed={embedData as any} />
      )}

      {selectedImageIndex !== null && imageData.urls[selectedImageIndex] && (
        <ImageViewer
          visible={selectedImageIndex !== null}
          onClose={handleCloseImageViewer}
          imageUrl={imageData.urls[selectedImageIndex]}
          altText={imageData.altTexts[selectedImageIndex]}
        />
      )}
    </>
  );
});

function extractVideo(embed: BlueskyEmbed, t: (key: any) => string) {
  if (embed.$type === 'app.bsky.embed.video#view' && embed.playlist) {
    return {
      videoUrl: embed.playlist,
      thumbnailUrl: embed.thumbnail,
      altText: embed.alt || t('common.video'),
      aspectRatio: embed.aspectRatio,
    };
  }

  if (embed.video) {
    return {
      videoUrl: embed.video.ref.$link,
      thumbnailUrl: embed.video.ref.$link,
      altText: embed.video.alt || t('common.video'),
      aspectRatio: embed.aspectRatio,
    };
  }

  return null;
}

const styles = StyleSheet.create({
  imagesContainer: {
    gap: spacing.xs,
  },
  // For 2+ image posts, lay the images out as a wrapping 2-up grid instead
  // of a stacked column of full-width images. Two images become a side-by-
  // side row; three become 2-up + 1 full-width on the next row; four
  // become a 2x2. Single-image posts keep their original aspect ratio.
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    // ~50% minus half the container gap so two cells fit a row with
    // breathing room. RN can't compute `calc(50% - gap/2)`, but a hair
    // under 50% lands cleanly on every viewport we ship to.
    flexBasis: '49.5%',
    flexGrow: 1,
  },
  image: {
    width: '100%',
    borderRadius: radius.sm,
    borderWidth: layout.border,
    borderColor: 'transparent',
  },
  gridImage: {
    aspectRatio: 1,
  },
});
