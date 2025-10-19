import { Image } from 'expo-image';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type YouTubeEmbedProps = {
  /** YouTube embed data from Bluesky */
  embed: {
    $type: 'app.bsky.embed.external' | 'app.bsky.embed.external#view';
    external: {
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
  };
};

/**
 * Component to display YouTube video embeds
 * Shows thumbnail, title, description, and opens YouTube when tapped
 */
export function YouTubeEmbed({ embed }: YouTubeEmbedProps) {
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
    Linking.openURL(embed.external.uri);
  };

  // Extract YouTube video ID from URI
  const getYouTubeVideoId = (uri: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = uri.match(pattern);
      if (match) return match[1];
    }

    return null;
  };

  const videoId = getYouTubeVideoId(embed.external.uri);
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : embed.external.thumb?.ref?.$link;

  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <View style={[styles.container, { borderColor, backgroundColor: 'transparent' }]}>
        <ThemedView style={styles.thumbnailContainer}>
          {thumbnailUrl && (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnail}
              contentFit="cover"
              placeholder={require('@/assets/images/partial-react-logo.png')}
            />
          )}
          <ThemedView style={styles.playButton}>
            <IconSymbol name="play.circle.fill" size={48} color="#ffffff" />
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.content}>
          <ThemedText style={[styles.title, { color: textColor }]} numberOfLines={2}>
            {embed.external.title}
          </ThemedText>
          <ThemedText style={[styles.description, { color: secondaryTextColor }]} numberOfLines={2}>
            {embed.external.description}
          </ThemedText>
          <ThemedText style={[styles.source, { color: secondaryTextColor }]}>{t('ui.youtube')}</ThemedText>
        </ThemedView>
      </View>
    </TouchableOpacity>
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
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
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
