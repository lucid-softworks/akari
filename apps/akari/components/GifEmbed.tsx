import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { spacing, radius, fontSize, fontWeight, layout, activeOpacity } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type GifEmbedProps = {
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

export function GifEmbed({ embed }: GifEmbedProps) {
  const { t } = useTranslation();
  const borderColor = useThemeColor({ light: '#e8eaed', dark: '#2d3133' }, 'background');
  const [aspectRatio, setAspectRatio] = useState(1);

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(embed.external.uri)}
      activeOpacity={activeOpacity.subtle}
    >
      <View style={[styles.container, { borderColor }]}>
        <Image
          source={{ uri: embed.external.uri }}
          style={[styles.gif, { aspectRatio }]}
          contentFit="contain"
          autoplay
          onLoad={(e) => {
            if (e.source.width && e.source.height) {
              setAspectRatio(e.source.width / e.source.height);
            }
          }}
        />
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>{t('ui.gif')}</ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: layout.border,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  gif: {
    width: '100%',
    backgroundColor: '#000',
  },
  badge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.xs,
  },
  badgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
});
