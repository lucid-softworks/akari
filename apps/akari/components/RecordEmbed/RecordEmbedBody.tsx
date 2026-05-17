import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ExternalEmbed } from '@/components/ExternalEmbed';
import { GifEmbed } from '@/components/GifEmbed';
import { Image } from '@/components/Image';
import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { ThemedView } from '@/components/ThemedView';
import { VideoEmbed } from '@/components/VideoEmbed';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { fontSize, layout, radius, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

import {
  classifyExternalEmbed,
  getExternalEmbed,
  getImageData,
  getVideoData,
  getQuotedText,
  hasNativeVideo,
} from '@/components/RecordEmbed/recordEmbedUtils';
import type { BlueskyEmbed, BlueskyRecord } from '@/bluesky-api';
import { useTranslation } from '@/hooks/useTranslation';

type RecordEmbedShape = BlueskyEmbed & {
  record: BlueskyRecord;
  media?: BlueskyEmbed;
};

export type RecordEmbedBodyProps = {
  embed: RecordEmbedShape;
};

export function RecordEmbedBody({ embed }: RecordEmbedBodyProps) {
  const [imageDimensions, setImageDimensions] = useState<{
    [key: string]: { width: number; height: number };
  }>({});
  const { t } = useTranslation();
  const textColor = useThemeColor({ light: '#000000', dark: '#ffffff' }, 'text');

  const handleImageLoad = (imageUrl: string, width: number, height: number) => {
    if (width > 0 && height > 0 && isFinite(width) && isFinite(height)) {
      setImageDimensions((prev) => ({
        ...prev,
        [imageUrl]: { width, height },
      }));
    }
  };

  const quotedText = getQuotedText(embed);
  const { urls: imageUrls } = getImageData(embed);
  const videoData = getVideoData(embed, t('common.video'));
  const externalEmbed = getExternalEmbed(embed);
  const externalKind = externalEmbed ? classifyExternalEmbed(externalEmbed.external?.uri) : null;
  const isNative = hasNativeVideo(embed);

  return (
    <ThemedView style={styles.content}>
      {quotedText.trim() ? (
        <RichTextWithFacets
          text={quotedText}
          facets={(embed.record as unknown as { facets?: unknown }).facets as never}
          style={[styles.text, { color: textColor }]}
        />
      ) : null}

      {isNative && videoData ? <VideoEmbed embed={videoData} /> : null}

      {externalEmbed && externalKind === 'externalVideo' ? (
        <VideoEmbed embed={externalEmbed} />
      ) : null}

      {externalEmbed && externalKind === 'youtube' ? <YouTubeEmbed embed={externalEmbed} /> : null}

      {externalEmbed && externalKind === 'gif' ? <GifEmbed embed={externalEmbed} /> : null}

      {externalEmbed && externalKind === 'external' ? (
        <ExternalEmbed embed={externalEmbed} />
      ) : null}

      {imageUrls.length > 0 ? (
        <ThemedView style={styles.imagesContainer}>
          {imageUrls.map((imageUrl: string) => {
            const dimensions = imageDimensions[imageUrl];
            const screenWidth = 300;
            const imageHeight = dimensions
              ? (dimensions.height / dimensions.width) * screenWidth
              : 200;

            return (
              <Image
                key={`${embed.record.uri}-${imageUrl}`}
                source={{ uri: imageUrl }}
                style={[styles.image, { height: imageHeight }]}
                contentFit="contain"
                onLoad={(event) =>
                  handleImageLoad(imageUrl, event.source.width, event.source.height)
                }
              />
            );
          })}
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  text: {
    fontSize: fontSize.md,
    lineHeight: 18,
    marginBottom: 6,
  },
  imagesContainer: {
    gap: spacing.xs,
  },
  image: {
    width: '100%',
    borderRadius: radius.sm,
    borderWidth: layout.border,
    borderColor: 'transparent',
  },
});
