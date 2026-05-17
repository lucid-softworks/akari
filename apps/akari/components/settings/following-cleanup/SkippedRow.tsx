import { Pressable, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { PressableLink } from '@/components/ui/PressableLink';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, hitSlop, layout, radius, spacing } from '@/constants/tokens';
import type { FollowingCleanupEntry } from '@/utils/followingCleanupController';

const AVATAR_SIZE = 36;

export type SkippedRowProps = {
  entry: FollowingCleanupEntry;
  isLast: boolean;
  href: string;
  onUnskip: () => void;
  borderColor: string;
  textColor: string;
  subduedColor: string;
  tintColor: string;
  unskipLabel: string;
};

export function SkippedRow({
  entry,
  isLast,
  href,
  onUnskip,
  borderColor,
  textColor,
  subduedColor,
  tintColor,
  unskipLabel,
}: SkippedRowProps) {
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
        </View>
      </PressableLink>
      <Pressable
        onPress={onUnskip}
        accessibilityRole="button"
        accessibilityLabel={unskipLabel}
        hitSlop={hitSlop}
        style={({ pressed }) => [
          styles.actionButton,
          { borderColor: tintColor },
          pressed && { opacity: 0.7 },
        ]}
      >
        <ThemedText style={[styles.actionText, { color: tintColor }]}>{unskipLabel}</ThemedText>
      </Pressable>
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
});
