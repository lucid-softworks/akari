import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { activeOpacity, fontSize, fontWeight, layout, semanticColors, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

const AVATAR_INNER = layout.avatarLarge - 6;

type ProfileAvatarProps = {
  avatar?: string;
  displayName?: string;
  handle: string;
  /** When true, draw a blue Flashes-story ring and make the avatar tappable. */
  hasStory?: boolean;
  /** Tap handler — only wired when `hasStory` (opens the story Lightbox). */
  onPress?: () => void;
};

export function ProfileAvatar({ avatar, displayName, handle, hasStory, onPress }: ProfileAvatarProps) {
  const avatarBorderColor = useThemeColor({}, 'background');

  const inner = avatar ? (
    <View style={[styles.avatar, { borderColor: avatarBorderColor }]}>
      <Image source={{ uri: avatar }} style={styles.avatarImage} contentFit="cover" />
    </View>
  ) : (
    <View style={[styles.avatar, { borderColor: avatarBorderColor }]}>
      <View style={styles.avatarFallbackContainer}>
        <ThemedText style={styles.avatarFallback}>
          {(displayName || handle || 'U')[0].toUpperCase()}
        </ThemedText>
      </View>
    </View>
  );

  if (hasStory) {
    return (
      <View style={styles.avatarContainer}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`View ${displayName || handle}'s story`}
          style={({ pressed }) => [styles.storyRing, pressed && { opacity: activeOpacity.subtle }]}
        >
          {inner}
        </Pressable>
      </View>
    );
  }

  return <View style={styles.avatarContainer}>{inner}</View>;
}

const styles = StyleSheet.create({
  avatarContainer: {
    marginTop: -50,
    marginBottom: spacing.sm,
  },
  // Instagram-style story ring: a blue circle with a small gap (padding)
  // before the avatar's own background-colored border.
  storyRing: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: semanticColors.systemBlue,
    padding: 3,
  },
  avatar: {
    width: layout.avatarLarge,
    height: layout.avatarLarge,
    borderRadius: layout.avatarLarge / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  avatarImage: {
    width: AVATAR_INNER,
    height: AVATAR_INNER,
    borderRadius: AVATAR_INNER / 2,
  },
  avatarFallbackContainer: {
    width: AVATAR_INNER,
    height: AVATAR_INNER,
    borderRadius: AVATAR_INNER / 2,
    backgroundColor: semanticColors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallback: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
});
