import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, layout, semanticColors, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

const AVATAR_INNER = layout.avatarLarge - 6;

type ProfileAvatarProps = {
  avatar?: string;
  displayName?: string;
  handle: string;
};

export function ProfileAvatar({ avatar, displayName, handle }: ProfileAvatarProps) {
  const avatarBorderColor = useThemeColor({}, 'background');

  return (
    <View style={styles.avatarContainer}>
      {avatar ? (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    marginTop: -50,
    marginBottom: spacing.sm,
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
