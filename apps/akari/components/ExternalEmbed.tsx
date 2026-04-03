import { Image } from 'expo-image';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { spacing, radius, fontSize, fontWeight, lineHeight, activeOpacity, layout } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type ExternalEmbedProps = {
  /** External embed data from Bluesky */
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
 * Component to display external link embeds (non-YouTube)
 * Shows thumbnail, title, description, and opens the link when tapped
 */
export function ExternalEmbed({ embed }: ExternalEmbedProps) {
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

  // Extract domain from URI for display
  const getDomain = (uri: string): string => {
    try {
      const url = new URL(uri);
      return url.hostname.replace('www.', '');
    } catch {
      return t('common.externalLink');
    }
  };

  const domain = getDomain(embed.external.uri);

  const borderColor = useThemeColor(
    {
      light: '#e8eaed',
      dark: '#2d3133',
    },
    'background',
  );

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={activeOpacity.subtle}>
      <View style={[styles.container, { borderColor, backgroundColor: 'transparent' }]}>
        <ThemedView style={styles.content}>
          {embed.external.thumb && embed.external.thumb.ref?.$link && (
            <Image
              source={{ uri: embed.external.thumb.ref.$link }}
              style={styles.thumbnail}
              contentFit="cover"
              placeholder={require('@/assets/images/partial-react-logo.png')}
            />
          )}

          <ThemedView style={styles.textContent}>
            <ThemedText style={[styles.title, { color: textColor }]} numberOfLines={2}>
              {embed.external.title}
            </ThemedText>
            <ThemedText style={[styles.description, { color: secondaryTextColor }]} numberOfLines={2}>
              {embed.external.description}
            </ThemedText>
            <ThemedText style={[styles.domain, { color: secondaryTextColor }]}>{domain}</ThemedText>
          </ThemedView>
        </ThemedView>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: layout.border,
  },
  content: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
  },
  textContent: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.normal,
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: 18,
  },
  domain: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});
