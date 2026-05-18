import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, radius, shadows, spacing } from '@/constants/tokens';
import { useFollowUser } from '@/hooks/mutations/useFollowUser';
import { useProfile } from '@/hooks/queries/useProfile';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const HOVER_DELAY_MS = 400;
const LEAVE_GRACE_MS = 150;
const CARD_WIDTH = 320;
const CARD_MAX_HEIGHT = 320;

type ProfileHoverTriggerProps = {
  handle: string;
  children: React.ReactNode;
};

type CardPosition = { top: number; left: number };

/**
 * Wraps a child element that links to a profile. On web, hovering for
 * 400ms reveals a floating preview card with the user's banner, avatar,
 * bio and follow counts. The card is rendered via a DOM portal so it
 * escapes ancestor `overflow: hidden` and stacking contexts; on native,
 * this is a passthrough (no hover).
 */
export function ProfileHoverTrigger({ handle, children }: ProfileHoverTriggerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CardPosition | null>(null);
  const triggerRef = useRef<View>(null);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, []);

  const handleEnter = useCallback(() => {
    clearTimers();
    enterTimer.current = setTimeout(() => {
      if (Platform.OS === 'web' && triggerRef.current) {
        const el = triggerRef.current as unknown as Element;
        const rect = el.getBoundingClientRect();
        // Flip up if the card would render off the bottom of the viewport.
        const wouldOverflow = rect.bottom + CARD_MAX_HEIGHT + 16 > window.innerHeight;
        const top = wouldOverflow
          ? rect.top + window.scrollY - CARD_MAX_HEIGHT - 8
          : rect.bottom + window.scrollY + 6;
        const maxLeft = Math.max(8, window.innerWidth - CARD_WIDTH - 8);
        const left = Math.min(rect.left + window.scrollX, maxLeft);
        setPosition({ top, left });
      }
      setOpen(true);
    }, HOVER_DELAY_MS);
  }, [clearTimers]);

  const handleLeave = useCallback(() => {
    clearTimers();
    leaveTimer.current = setTimeout(() => {
      setOpen(false);
      setPosition(null);
    }, LEAVE_GRACE_MS);
  }, [clearTimers]);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View
      ref={triggerRef}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
    >
      {children}
      {open && position ? (
        <HoverCardPortal position={position}>
          <View
            onPointerEnter={clearTimers}
            onPointerLeave={handleLeave}
          >
            <ProfileHoverCard handle={handle} />
          </View>
        </HoverCardPortal>
      ) : null}
    </View>
  );
}

type HoverCardPortalProps = {
  position: CardPosition;
  children: React.ReactNode;
};

function HoverCardPortal({ position, children }: HoverCardPortalProps) {
  // react-dom is only available on web; require() so native bundlers don't
  // try to resolve it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createPortal } = require('react-dom') as typeof import('react-dom');
  return createPortal(
    <div
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        width: CARD_WIDTH,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

type ProfileHoverCardProps = {
  handle: string;
};

function ProfileHoverCard({ handle }: ProfileHoverCardProps) {
  const { t } = useTranslation();
  const { data: profile, isLoading } = useProfile(handle);
  const panelColor = useThemeColor({}, 'panel');
  const lineSoft = useThemeColor({}, 'lineSoft');
  const textPrimary = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentColor = useThemeColor({}, 'tint');
  const placeholderBg = useThemeColor({}, 'hover');

  const followMutation = useFollowUser();
  const [optimisticUri, setOptimisticUri] = useState<string | undefined>(undefined);

  const followingUri = optimisticUri ?? profile?.viewer?.following;
  const isFollowing = Boolean(followingUri);

  const handleFollow = useCallback(
    (e: { stopPropagation?: () => void }) => {
      e.stopPropagation?.();
      if (!profile) return;
      if (isFollowing && followingUri) {
        const prev = followingUri;
        setOptimisticUri(undefined);
        followMutation.mutate(
          { did: profile.did, followUri: prev, action: 'unfollow' },
          { onError: () => setOptimisticUri(prev) },
        );
      } else {
        setOptimisticUri('pending');
        followMutation.mutate(
          { did: profile.did, action: 'follow' },
          { onError: () => setOptimisticUri(undefined) },
        );
      }
    },
    [profile, isFollowing, followingUri, followMutation],
  );

  const handleOpenProfile = useCallback(() => {
    router.push(`/profile/${handle}` as never);
  }, [handle]);

  return (
    <Pressable
      onPress={handleOpenProfile}
      style={[
        styles.card,
        {
          backgroundColor: panelColor,
          borderColor: lineSoft,
        },
        shadows.md,
      ]}
    >
      <View style={[styles.banner, { backgroundColor: placeholderBg }]}>
        {profile?.banner ? (
          <Image
            source={{ uri: profile.banner }}
            style={styles.bannerImage}
            contentFit="cover"
          />
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: accentColor, borderColor: panelColor }]}>
            {profile?.avatar ? (
              <Image
                source={{ uri: profile.avatar }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <ThemedText style={styles.avatarInitial}>
                {(profile?.displayName || handle).charAt(0).toUpperCase()}
              </ThemedText>
            )}
          </View>
          {profile ? (
            <Pressable
              onPress={handleFollow}
              style={[
                styles.followButton,
                isFollowing
                  ? { borderColor: accentColor, backgroundColor: 'transparent' }
                  : { backgroundColor: accentColor, borderColor: accentColor },
              ]}
              accessibilityRole="button"
              accessibilityLabel={isFollowing ? t('common.following') : t('common.follow')}
            >
              <ThemedText
                style={[
                  styles.followButtonText,
                  { color: isFollowing ? accentColor : '#ffffff' },
                ]}
              >
                {isFollowing ? t('common.following') : t('common.follow')}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
        <ThemedText style={[styles.displayName, { color: textPrimary }]} numberOfLines={1}>
          {profile?.displayName ?? handle}
        </ThemedText>
        <ThemedText style={[styles.handle, { color: textSecondary }]} numberOfLines={1}>
          @{handle}
        </ThemedText>
        {profile?.description ? (
          <ThemedText
            style={[styles.bio, { color: textPrimary }]}
            numberOfLines={3}
          >
            {profile.description}
          </ThemedText>
        ) : null}
        {profile ? (
          <View style={styles.countsRow}>
            <ThemedText style={[styles.countNumber, { color: textPrimary }]}>
              {profile.followersCount ?? 0}
            </ThemedText>
            <ThemedText style={[styles.countLabel, { color: textSecondary }]}>
              {t('navigation.followers')}
            </ThemedText>
            <ThemedText style={[styles.countNumber, styles.countNumberRight, { color: textPrimary }]}>
              {profile.followsCount ?? 0}
            </ThemedText>
            <ThemedText style={[styles.countLabel, { color: textSecondary }]}>
              {t('common.following')}
            </ThemedText>
          </View>
        ) : isLoading ? (
          <ThemedText style={[styles.bio, { color: textSecondary }]}>…</ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  banner: {
    width: '100%',
    height: 80,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -28,
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
  },
  followButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  followButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  displayName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
  },
  handle: {
    fontSize: fontSize.base,
    marginTop: 2,
  },
  bio: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.sm,
  },
  countNumber: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  countNumberRight: {
    marginLeft: spacing.md,
  },
  countLabel: {
    fontSize: fontSize.sm,
    marginLeft: 4,
  },
});
