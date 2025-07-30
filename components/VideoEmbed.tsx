import { Image } from 'expo-image';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type VideoEmbedProps = {
  /** Video embed data from Bluesky or native video data */
  embed: {
    $type?: string;
    external?: {
      description: string;
      thumb?: {
        $type: 'blob';
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
        image: {
          ref: {
            $link: string;
          };
          mimeType: string;
          size: number;
        };
        thumb: {
          ref: {
            $link: string;
          };
          mimeType: string;
          size: number;
        };
        fullsize: {
          ref: {
            $link: string;
          };
          mimeType: string;
          size: number;
        };
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
export function VideoEmbed({ embed, onClose }: VideoEmbedProps) {
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

  // Check if this is a native video embed
  const isNativeVideo = () => {
    return embed.videoUrl && embed.videoUrl.trim() !== '';
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

    if (embed.external?.thumb?.ref?.$link) {
      return embed.external.thumb.ref.$link;
    }

    // For future native video support
    if (embed.media?.video?.thumb?.ref?.$link) {
      return embed.media.video.thumb.ref.$link;
    }

    return null;
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

    return t('common.video');
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

  // Get video URL
  const getVideoUrl = (): string => {
    if (embed.videoUrl) {
      return embed.videoUrl;
    }

    if (embed.external?.uri) {
      return embed.external.uri;
    }

    // For future native video support
    if (embed.media?.video?.url) {
      return embed.media.video.url;
    }

    return '';
  };

  const thumbnailUrl = getThumbnailUrl();
  const videoTitle = getVideoTitle();
  const videoDescription = getVideoDescription();
  const videoUrl = getVideoUrl();

  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  // If we have a native video URL, use the VideoPlayer component
  if (isNativeVideo() && videoUrl) {
    return (
      <VideoPlayer
        videoUrl={videoUrl}
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
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <View style={[styles.container, { borderColor, backgroundColor: 'transparent' }]}>
          <ThemedView style={[styles.thumbnailContainer, { aspectRatio: thumbnailAspectRatio }]}>
            {thumbnailUrl ? (
              <Image
                source={{ uri: thumbnailUrl }}
                style={styles.thumbnail}
                contentFit="cover"
                placeholder={require('@/assets/images/partial-react-logo.png')}
              />
            ) : (
              <ThemedView style={styles.placeholderContainer}>
                <ThemedText style={styles.placeholderIcon}>🎥</ThemedText>
              </ThemedView>
            )}
            <ThemedView style={styles.playButton}>
              <ThemedText style={styles.playIcon}>▶️</ThemedText>
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
            <ThemedText style={[styles.source, { color: secondaryTextColor }]}>External Video</ThemedText>
          </ThemedView>
        </View>
      </TouchableOpacity>
    );
  }

  // Fallback: show placeholder
  const placeholderAspectRatio = embed.aspectRatio ? embed.aspectRatio.width / embed.aspectRatio.height : 16 / 9;

  return (
    <View style={[styles.container, { borderColor, backgroundColor: 'transparent' }]}>
      <ThemedView style={[styles.placeholderContainer, { aspectRatio: placeholderAspectRatio }]}>
        <ThemedText style={styles.placeholderIcon}>🎥</ThemedText>
        <ThemedText style={[styles.placeholderText, { color: textColor }]}>Video content</ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
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
    opacity: 0.5,
  },
  placeholderText: {
    fontSize: 14,
    marginTop: 8,
    opacity: 0.7,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 16,
  },
  content: {
    padding: 12,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
  },
  source: {
    fontSize: 12,
    marginTop: 4,
  },
});
