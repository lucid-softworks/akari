import type { ImageStyle } from 'expo-image';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

type AvatarOrInitialProps = {
  uri?: string | null;
  /** Handle, displayName, or DID — only the first character is used. */
  seed: string;
  size: number;
  /** Additional styles. ViewStyle for the fallback circle, ImageStyle for the rendered avatar. */
  style?: StyleProp<ViewStyle & ImageStyle>;
};

/**
 * Renders the actor's avatar when a URL is present, or a coloured circle
 * containing the first character of `seed` when it's missing. Used in
 * place of remote default-avatar fetches so missing avatars don't leak
 * traffic to bsky.app's static asset host.
 */
export function AvatarOrInitial({ uri, seed, size, style }: AvatarOrInitialProps) {
  const accent = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[dimensionStyle, style]} contentFit="cover" />;
  }

  const letter = (seed?.replace(/^@/, '').charAt(0) || '?').toUpperCase();
  return (
    <View
      style={[
        styles.fallback,
        dimensionStyle,
        { backgroundColor: accent },
        style,
      ]}
    >
      <ThemedText style={[styles.letter, { fontSize: Math.max(12, size * 0.45) }]}>{letter}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
