import { StyleSheet } from 'react-native';

import type { BlueskyEmbed } from '@/bluesky-api';
import { ExternalEmbed } from '@/components/ExternalEmbed';
import { GifEmbed } from '@/components/GifEmbed';
import { Image } from '@/components/Image';
import { RecordEmbed } from '@/components/RecordEmbed';
import { ThemedView } from '@/components/ThemedView';
import { VideoEmbed } from '@/components/VideoEmbed';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

import {
  getExternalEmbedData,
  getGifEmbedData,
  getImageEmbedData,
  getRecordEmbedData,
  getVideoEmbedData,
  getYouTubeEmbedData,
} from '@/components/messages/conversation/messageEmbedUtils';

export type MessageEmbedProps = {
  embed: BlueskyEmbed;
  messageId: string;
  imageDimensions: Record<string, { width: number; height: number }>;
  onImageLoad: (imageUrl: string, width: number, height: number) => void;
};

/**
 * Dispatches a chat-message embed to the appropriate inner component
 * (record / video / youtube / gif / external / images). Returns null when
 * the embed kind is unrecognised.
 */
export function MessageEmbed({ embed, messageId, imageDimensions, onImageLoad }: MessageEmbedProps) {
  const { t } = useTranslation();

  const recordEmbed = getRecordEmbedData(embed);
  if (recordEmbed) return <RecordEmbed embed={recordEmbed} />;

  const videoEmbed = getVideoEmbedData(embed);
  if (videoEmbed) {
    return <VideoEmbed embed={{ ...videoEmbed, altText: videoEmbed.altText || t('common.video') }} />;
  }

  const youTubeEmbed = getYouTubeEmbedData(embed);
  if (youTubeEmbed) return <YouTubeEmbed embed={youTubeEmbed} />;

  const gifEmbed = getGifEmbedData(embed);
  if (gifEmbed) return <GifEmbed embed={gifEmbed} />;

  const externalEmbed = getExternalEmbedData(embed);
  if (externalEmbed) return <ExternalEmbed embed={externalEmbed} />;

  const imageData = getImageEmbedData(embed);
  if (imageData.length > 0) {
    return (
      <ThemedView style={styles.messageImagesContainer}>
        {imageData.map((image) => {
          const dimensions = imageDimensions[image.url];
          const imageWidth = 260;
          const imageHeight = dimensions ? (dimensions.height / dimensions.width) * imageWidth : 220;

          return (
            <Image
              key={`${messageId}-${image.url}`}
              source={{ uri: image.url }}
              style={[styles.messageImage, { width: imageWidth, height: imageHeight }]}
              contentFit="cover"
              onLoad={(event) => onImageLoad(image.url, event.source.width, event.source.height)}
              accessible
              accessibilityLabel={image.alt || 'Image attachment'}
            />
          );
        })}
      </ThemedView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  messageImagesContainer: {
    gap: spacing.sm,
  },
  messageImage: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
});
