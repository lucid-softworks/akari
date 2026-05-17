import React, { useCallback } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import type { BlueskyVerification } from '@/bluesky-api';
import { AvatarOrInitial } from '@/components/AvatarOrInitial';
import { ThemedText } from '@/components/ThemedText';
import { VerificationBadge } from '@/components/VerificationBadge';
import { PressableLink } from '@/components/ui/PressableLink';
import { spacing, fontSize, fontWeight, opacity, semanticColors, layout } from '@/constants/tokens';
import { useNavigateToProfile, useProfileHref } from '@/utils/navigation';

type PostHeaderProps = {
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    verification?: BlueskyVerification;
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
            <AvatarOrInitial
              uri={author.avatar}
              seed={author.displayName || author.handle}
              size={layout.avatarMedium}
            />
            {isLive && (
              <View style={styles.liveBadge}>
                <ThemedText style={styles.liveBadgeText}>LIVE</ThemedText>
              </View>
            )}
          </View>
        </PressableLink>
        <View style={styles.authorInfo}>
          <View style={styles.displayNameRow}>
            <ThemedText style={styles.displayName} numberOfLines={1}>{authorName}</ThemedText>
            <VerificationBadge
              subjectDid={author.did}
              verification={author.verification}
              subjectHandle={author.handle}
              subjectDisplayName={author.displayName}
              size={fontSize.base}
            />
          </View>
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
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  displayName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    flexShrink: 1,
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
