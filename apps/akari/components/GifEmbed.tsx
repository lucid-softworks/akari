import { Image } from 'expo-image';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

type GifEmbedProps = {
  /** GIF embed data from Bluesky */
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
 * Component to display GIF embeds from Tenor
 * Shows the GIF thumbnail and opens the GIF when tapped
 */
export function GifEmbed({ embed }: GifEmbedProps) {
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
        <ThemedView style={styles.content}>
          <Image
            source={{ uri: embed.external.uri }}
            style={styles.gifImage}
            contentFit="cover"
            placeholder={require('@/assets/images/partial-react-logo.png')}
          />

          <ThemedView style={styles.textContent}>
            <ThemedText style={[styles.title, { color: textColor }]} numberOfLines={2}>
              {embed.external.title}
            </ThemedText>
            {embed.external.description && (
              <ThemedText style={[styles.description, { color: secondaryTextColor }]} numberOfLines={2}>
                {embed.external.description}
              </ThemedText>
            )}
            <ThemedText style={[styles.source, { color: secondaryTextColor }]}>GIF</ThemedText>
          </ThemedView>
        </ThemedView>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  gifImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    margin: 12,
    minWidth: 200,
    maxWidth: 300,
  },
  textContent: {
    flex: 1,
    padding: 12,
    paddingLeft: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
  },
  source: {
    fontSize: 12,
    fontWeight: '500',
  },
});
