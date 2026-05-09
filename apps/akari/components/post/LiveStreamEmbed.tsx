import React, { useCallback } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  layout,
  radius,
  spacing,
} from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export type LiveStreamInfo = {
  uri: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  domain: string;
};

type LiveStreamEmbedProps = {
  info: LiveStreamInfo;
};

/**
 * Inline player for live streams flagged by the bsky live-now config
 * (stream.place, twitch, etc.). On web we drop in an iframe pointed at
 * the stream's watch page — most live platforms serve a chromeless
 * player from that URL when embedded — and on native we keep the
 * existing thumbnail card with a "Watch live" CTA, since RN can't
 * iframe and adding a WebView dependency just for posts is too heavy.
 *
 * The 16:9 aspect ratio matches every major streaming service. Posts
 * still render the link card below this player so the title and
 * description stay visible.
 */
export function LiveStreamEmbed({ info }: LiveStreamEmbedProps) {
  const { t } = useTranslation();
  const borderColor = useThemeColor({ light: '#e8eaed', dark: '#2d3133' }, 'background');

  const handleOpen = useCallback(() => {
    void Linking.openURL(info.uri).catch((error) => {
      if (__DEV__) console.warn('Failed to open live stream', error);
    });
  }, [info.uri]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { borderColor }]}>
        <View style={styles.playerWrap}>
          {/* eslint-disable-next-line react/forbid-elements */}
          {React.createElement('iframe', {
            src: info.uri,
            allow: 'autoplay; fullscreen; picture-in-picture; encrypted-media',
            allowFullScreen: true,
            referrerPolicy: 'no-referrer-when-downgrade',
            style: {
              width: '100%',
              height: '100%',
              border: 0,
            },
            title: info.title ?? info.domain,
          })}
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <ThemedText style={styles.liveBadgeText}>{t('common.live')}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={handleOpen}
      accessibilityRole="button"
      accessibilityLabel={t('common.watchNow')}
      style={({ pressed }) => [
        styles.container,
        { borderColor },
        pressed && { opacity: activeOpacity.subtle },
      ]}
    >
      <View style={styles.playerWrap}>
        {info.thumbnail ? (
          <Image source={{ uri: info.thumbnail }} style={styles.thumbnail} contentFit="cover" />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailFallback]} />
        )}
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <IconSymbol name="play.fill" size={28} color="#FFFFFF" />
          </View>
        </View>
      </View>
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <ThemedText style={styles.liveBadgeText}>{t('common.live')}</ThemedText>
      </View>
      <View style={styles.watchBar}>
        <ThemedText style={styles.watchBarLabel} numberOfLines={1}>
          {info.title ?? info.domain}
        </ThemedText>
        <ThemedText style={styles.watchBarCta}>{t('common.watchNow')}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    borderWidth: layout.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  playerWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    backgroundColor: '#1c1c1e',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.xs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  watchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  watchBarLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  watchBarCta: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
