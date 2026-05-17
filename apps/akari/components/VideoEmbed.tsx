import { Image } from '@/components/Image';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VideoPlayer } from '@/components/VideoPlayer';
import { spacing, radius, fontSize, fontWeight, opacity, layout, activeOpacity } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { matchYouTubeId, resolveExternalThumb, vimeoThumbnailFor, youtubeThumbnailUrl } from '@/utils/embedThumb';

type VideoEmbedProps = {
  /** Video embed data from Bluesky or native video data */
  embed: {
    $type?: string;
    external?: {
      description: string;
      thumb?: {
        $type?: 'blob';
        ref: {
          $link: string;
        };
        mimeType: string;
        size: number;
      };
      title: string;
      uri: string;
    };
    media?: {
      $type: string;
      images?: {
        alt: string;
        image?: {
          ref: {
            $link: string;
          };
          mimeType: string;
          size: number;
        };
        thumb: string;
        fullsize: string;
        aspectRatio?: {
          width: number;
          height: number;
        };
      }[];
      video?: {
        alt: string;
        ref: {
          $link: string;
        };
        mimeType: string;
        size: number;
        aspectRatio?: {
          width: number;
          height: number;
        };
        thumb?: {
          ref: {
            $link: string;
          };
        };
        title?: string;
        description?: string;
        url?: string;
      };
    };
    // Native video data structure
    videoUrl?: string;
    thumbnailUrl?: string;
    altText?: string;
    aspectRatio?: {
      width: number;
      height: number;
    };
  };
  /** Callback when video is closed */
  onClose?: () => void;
};

/**
 * Component to display video embeds
 * Supports both native Bluesky videos and external video links
 */
export function VideoEmbed({ embed }: VideoEmbedProps) {
  const { t } = useTranslation();
  const textColor = useThemeColor(
    {
      light: '#000000',
      dark: '#ffffff',
    },
    'text',
  );

  const secondaryTextColor = useThemeColor(
    {
      light: '#666666',
      dark: '#999999',
    },
    'text',
  );

  const handlePress = () => {
    // If it's an external video, open the link
    if (embed.external?.uri) {
      Linking.openURL(embed.external.uri);
    }
  };

  // Check if this is an external video embed
  const isExternalVideo = () => {
    return embed.external && embed.external.uri;
  };

  // Get video thumbnail URL
  const getThumbnailUrl = (): string | null => {
    if (embed.thumbnailUrl) {
      return embed.thumbnailUrl;
    }

    // External: prefer the bsky-resolved thumb URL string. If the embed
    // doesn't include one, derive a host-specific thumbnail (currently
    // YouTube) so the post still shows a preview.
    const externalThumb = resolveExternalThumb(embed.external?.thumb);
    if (externalThumb) return externalThumb;

    const externalUri = embed.external?.uri ?? '';
    const ytId = matchYouTubeId(externalUri);
    if (ytId) return youtubeThumbnailUrl(ytId);
    const vimeoThumb = vimeoThumbnailFor(externalUri);
    if (vimeoThumb) return vimeoThumb;

    // For future native video support
    return resolveExternalThumb(embed.media?.video?.thumb) ?? null;
  };

  // Get video title
  const getVideoTitle = (): string => {
    if (embed.external?.title) {
      return embed.external.title;
    }

    // For future native video support
    if (embed.media?.video?.title) {
      return embed.media.video.title;
    }

    return '';
  };

  // Get video description
  const getVideoDescription = (): string => {
    if (embed.external?.description) {
      return embed.external.description;
    }

    // For future native video support
    if (embed.media?.video?.description) {
      return embed.media.video.description;
    }

    return '';
  };

  const getNativeVideoUrl = (): string => {
    if (embed.videoUrl) {
      return embed.videoUrl;
    }

    if (embed.media?.video?.url) {
      return embed.media.video.url;
    }

    return '';
  };

  const thumbnailUrl = getThumbnailUrl();
  const videoTitle = getVideoTitle();
  const videoDescription = getVideoDescription();
  const nativeVideoUrl = getNativeVideoUrl();
  const hasNativeVideo = nativeVideoUrl.trim() !== '';

  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  // If we have a native video URL, use the VideoPlayer component
  if (hasNativeVideo && nativeVideoUrl) {
    return (
      <VideoPlayer
        videoUrl={nativeVideoUrl}
        thumbnailUrl={thumbnailUrl || undefined}
        title={videoTitle}
        description={videoDescription}
        aspectRatio={embed.aspectRatio}
      />
    );
  }

  // For external videos, show thumbnail with play button
  if (isExternalVideo()) {
    const thumbnailAspectRatio = embed.aspectRatio ? embed.aspectRatio.width / embed.aspectRatio.height : 16 / 9;

    return (
      <Pressable onPress={handlePress} style={({ pressed }) => pressed && { opacity: activeOpacity.subtle }}>
        <View style={[styles.container, { borderColor, backgroundColor: 'transparent' }]}>
          <ThemedView style={[styles.thumbnailContainer, { aspectRatio: thumbnailAspectRatio }]}>
            {thumbnailUrl ? (
              <Image
                source={{ uri: thumbnailUrl }}
                style={styles.thumbnail}
                contentFit="cover"
              />
            ) : (
              <ThemedView style={styles.placeholderContainer}>
                <ThemedText style={styles.placeholderIcon}>🎥</ThemedText>
              </ThemedView>
            )}
            <ThemedView style={styles.playButton}>
              <IconSymbol name="play.circle.fill" size={48} color="#ffffff" />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.content}>
            <ThemedText style={[styles.title, { color: textColor }]} numberOfLines={2}>
              {videoTitle}
            </ThemedText>
            {videoDescription && (
              <ThemedText style={[styles.description, { color: secondaryTextColor }]} numberOfLines={2}>
                {videoDescription}
              </ThemedText>
            )}
            <ThemedText style={[styles.source, { color: secondaryTextColor }]}>{t('ui.externalVideo')}</ThemedText>
          </ThemedView>
        </View>
      </Pressable>
    );
  }

  // Fallback: show placeholder
  const placeholderAspectRatio = embed.aspectRatio ? embed.aspectRatio.width / embed.aspectRatio.height : 16 / 9;

  return (
    <View style={[styles.container, { borderColor, backgroundColor: 'transparent' }]}>
      <ThemedView style={[styles.placeholderContainer, { aspectRatio: placeholderAspectRatio }]}>
        <ThemedText style={styles.placeholderIcon}>🎥</ThemedText>
        <ThemedText style={[styles.placeholderText, { color: textColor }]}>{t('ui.videoContent')}</ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: layout.border,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    opacity: opacity.tertiary,
  },
  placeholderText: {
    fontSize: fontSize.base,
    marginTop: spacing.sm,
    opacity: opacity.secondary,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: layout.avatarMedium,
    height: layout.avatarMedium,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: fontSize.lg,
  },
  content: {
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    lineHeight: 20,
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: 18,
  },
  source: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});
