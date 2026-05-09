import { Image, type ImageHandle } from '@/components/Image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { spacing, radius, fontSize, fontWeight, layout, activeOpacity } from '@/constants/tokens';
import { useFeedSettings } from '@/hooks/useFeedSettings';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type GifEmbedProps = {
  embed: {
    $type: 'app.bsky.embed.external' | 'app.bsky.embed.external#view';
    external: {
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
  };
};

export function GifEmbed({ embed }: GifEmbedProps) {
  const { t } = useTranslation();
  const { videoAutoplayEnabled } = useFeedSettings();
  const borderColor = useThemeColor({ light: '#e8eaed', dark: '#2d3133' }, 'background');
  const [aspectRatio, setAspectRatio] = useState(1);
  const [playing, setPlaying] = useState(videoAutoplayEnabled);
  const imageRef = useRef<ImageHandle | null>(null);

  // Keep the rendered animation in sync with the user's autoplay
  // preference when it flips while the GIF is on screen — the initial
  // mount already honoured it via `autoplay`, but a later toggle in
  // settings should still apply.
  useEffect(() => {
    setPlaying(videoAutoplayEnabled);
  }, [videoAutoplayEnabled]);

  const handleTogglePlay = useCallback(() => {
    setPlaying((prev) => {
      const next = !prev;
      const ref = imageRef.current;
      if (ref) {
        // expo-image's imperative API. The promises it returns are
        // best-effort fire-and-forget; if either method isn't supported
        // on the current platform the autoplay prop is the fallback.
        try {
          if (next) void ref.startAnimating?.();
          else void ref.stopAnimating?.();
        } catch {
          // Swallow — the user can tap again.
        }
      }
      return next;
    });
  }, []);

  return (
    <Pressable
      onPress={handleTogglePlay}
      accessibilityRole="button"
      accessibilityLabel={playing ? t('ui.pause') : t('ui.play')}
      style={({ pressed }) => pressed && { opacity: activeOpacity.subtle }}
    >
      <View style={[styles.container, { borderColor }]}>
        <Image
          ref={imageRef}
          source={{ uri: embed.external.uri }}
          style={[styles.gif, { aspectRatio }]}
          contentFit="contain"
          autoplay={playing}
          onLoad={(e) => {
            if (e.source.width && e.source.height) {
              setAspectRatio(e.source.width / e.source.height);
            }
          }}
        />
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>{t('ui.gif')}</ThemedText>
        </View>
        {!playing ? (
          <View pointerEvents="none" style={styles.playOverlay}>
            <View style={styles.playButton}>
              <IconSymbol name="play.fill" size={24} color="#FFFFFF" />
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
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
  playOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
