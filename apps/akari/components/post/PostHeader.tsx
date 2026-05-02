import { Image } from 'expo-image';
import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { PressableLink } from '@/components/ui/PressableLink';
import { spacing, fontSize, fontWeight, opacity, activeOpacity, semanticColors, layout } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useNavigateToProfile, useProfileHref } from '@/utils/navigation';

type PostHeaderProps = {
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  createdAt: string;
  isLive: boolean;
  onAvatarHoverChange?: (hovered: boolean) => void;
};

export const PostHeader = React.memo(function PostHeader({
  author,
  createdAt,
  isLive,
  onAvatarHoverChange,
}: PostHeaderProps) {
  const navigateToProfile = useNavigateToProfile();
  const profileHref = useProfileHref();

  const iconColor = useThemeColor(
    { light: '#687076', dark: '#9BA1A6' },
    'text',
  );

  const authorName = author.displayName || author.handle;

  const handleProfilePress = useCallback(() => {
    navigateToProfile({ actor: author.handle });
  }, [navigateToProfile, author.handle]);

  const handleAvatarPointerEnter = useCallback(() => {
    if (Platform.OS === 'web') {
      onAvatarHoverChange?.(true);
    }
  }, [onAvatarHoverChange]);

  const handleAvatarPointerLeave = useCallback(() => {
    if (Platform.OS === 'web') {
      onAvatarHoverChange?.(false);
    }
  }, [onAvatarHoverChange]);

  return (
    <View style={styles.header}>
      <View style={styles.authorSection}>
        <PressableLink
          href={profileHref(author.handle) as any}
          onPress={handleProfilePress}
          accessibilityLabel={`View ${authorName}'s profile via avatar`}
          style={styles.avatarPressable}
        >
          <View
            style={[styles.avatarWrapper, isLive && styles.liveAvatarWrapper]}
            onPointerEnter={handleAvatarPointerEnter}
            onPointerLeave={handleAvatarPointerLeave}
          >
            <Image
              source={{
                uri: author.avatar || 'https://bsky.app/static/default-avatar.png',
              }}
              style={styles.authorAvatar}
              contentFit="cover"
              placeholder={require('@/assets/images/partial-react-logo.png')}
            />
            {isLive && (
              <View style={styles.liveBadge}>
                <ThemedText style={styles.liveBadgeText}>LIVE</ThemedText>
              </View>
            )}
          </View>
        </PressableLink>
        <View style={styles.authorInfo}>
          <ThemedText style={styles.displayName}>{authorName}</ThemedText>
          <PressableLink
            href={profileHref(author.handle) as any}
            onPress={handleProfilePress}
            accessibilityLabel={`View profile of ${authorName}`}
          >
            <ThemedText style={styles.handle}>@{author.handle}</ThemedText>
          </PressableLink>
        </View>
      </View>
      <View style={styles.headerMeta}>
        <ThemedText style={styles.timestamp}>{createdAt}</ThemedText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
  },
  avatarPressable: {
    borderRadius: spacing.xxl,
  },
  avatarPressablePressed: {
    opacity: opacity.secondary,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveAvatarWrapper: {
    padding: spacing.xxs,
    borderWidth: 2,
    borderColor: semanticColors.live,
    borderRadius: spacing.xxl,
  },
  liveBadge: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    backgroundColor: semanticColors.live,
    paddingHorizontal: 6,
    paddingVertical: spacing.xxs,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  authorAvatar: {
    width: layout.avatarMedium,
    height: layout.avatarMedium,
    borderRadius: layout.avatarMedium / 2,
  },
  authorInfo: {
    flex: 1,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  handle: {
    fontSize: fontSize.base,
    opacity: opacity.secondary,
  },
  timestamp: {
    fontSize: fontSize.sm,
    opacity: 0.6,
  },
});
