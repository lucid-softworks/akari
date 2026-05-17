import { Pressable, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { PressableLink } from '@/components/ui/PressableLink';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, hitSlop, layout, radius, spacing } from '@/constants/tokens';
import type { FollowingCleanupEntry } from '@/utils/followingCleanupController';

const AVATAR_SIZE = 36;

export type FollowRowProps = {
  entry: FollowingCleanupEntry;
  isLast: boolean;
  href: string;
  onUnfollow: () => void;
  onSkip: () => void;
  unfollowPending: boolean;
  borderColor: string;
  textColor: string;
  subduedColor: string;
  dangerColor: string;
  unfollowLabel: string;
  skipLabel: string;
  lastActivityLabel: string;
  followedAtLabel: string | null;
  statsLabel: string | null;
};

export function FollowRow({
  entry,
  isLast,
  href,
  onUnfollow,
  onSkip,
  unfollowPending,
  borderColor,
  textColor,
  subduedColor,
  dangerColor,
  unfollowLabel,
  skipLabel,
  lastActivityLabel,
  followedAtLabel,
  statsLabel,
}: FollowRowProps) {
  return (
    <View
      style={[
        styles.row,
        !isLast && {
          borderBottomColor: borderColor,
          borderBottomWidth: layout.hairline,
        },
      ]}
    >
      <PressableLink
        href={href}
        accessibilityLabel={entry.profile.handle}
        style={styles.rowLinkArea}
      >
        {entry.profile.avatar ? (
          <Image source={{ uri: entry.profile.avatar }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor }]}>
            <IconSymbol name="person.fill" size={16} color={subduedColor} />
          </View>
        )}
        <View style={styles.rowText}>
          <ThemedText style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
            {entry.profile.displayName?.trim() || entry.profile.handle}
          </ThemedText>
          <ThemedText style={[styles.rowHandle, { color: subduedColor }]} numberOfLines={1}>
            @{entry.profile.handle}
          </ThemedText>
          <ThemedText style={[styles.rowMeta, { color: subduedColor }]} numberOfLines={1}>
            {lastActivityLabel}
            {followedAtLabel ? ` · ${followedAtLabel}` : ''}
          </ThemedText>
          {statsLabel ? (
            <ThemedText style={[styles.rowMeta, { color: subduedColor }]} numberOfLines={1}>
              {statsLabel}
            </ThemedText>
          ) : null}
        </View>
      </PressableLink>
      <View style={styles.rowActions}>
        <Pressable
          onPress={onSkip}
          accessibilityRole="button"
          accessibilityLabel={skipLabel}
          hitSlop={hitSlop}
          style={({ pressed }) => [
            styles.actionButton,
            { borderColor: subduedColor },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ThemedText style={[styles.actionText, { color: subduedColor }]}>{skipLabel}</ThemedText>
        </Pressable>
        <Pressable
          onPress={onUnfollow}
          disabled={unfollowPending}
          accessibilityRole="button"
          accessibilityLabel={unfollowLabel}
          hitSlop={hitSlop}
          style={({ pressed }) => [
            styles.actionButton,
            { borderColor: dangerColor },
            pressed && { opacity: 0.7 },
            unfollowPending && styles.disabled,
          ]}
        >
          <ThemedText style={[styles.actionText, { color: dangerColor }]}>{unfollowLabel}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowLinkArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  rowHandle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  rowMeta: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  disabled: {
    opacity: 0.5,
  },
});
