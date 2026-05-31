import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, opacity, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { formatCompactNumber } from '@/utils/formatNumber';

type MastodonActionButtonProps = {
  icon: string;
  /** Icon used when `isActive` is true (e.g. `heart.fill` vs `heart`). */
  activeIcon?: string;
  isActive?: boolean;
  /** Colour used when active. Resting colour falls back to the theme's
   *  tertiary text colour. */
  activeColor: string;
  /** Numeric counter shown to the right of the icon. Omit for icon-only
   *  affordances (e.g. bookmark). */
  count?: number;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
};

/**
 * One action affordance in the Mastodon post card's actions bar — Pressable
 * + icon + optional count. Single-file per the project's component rule.
 *
 * Intentionally simpler than the atproto `ActionButton` for now (no hover
 * wash, no per-action sheet integration). When Mastodon screens grow more
 * surfaces that need these buttons, this can converge with the atproto
 * one — for now keeping them separate avoids accidentally pulling in the
 * atproto-specific behaviours (quote sheet anchor, accessibility-mode
 * count-hiding driven by atproto-prefs).
 */
export const MastodonActionButton = React.memo(function MastodonActionButton({
  icon,
  activeIcon,
  isActive,
  activeColor,
  count,
  onPress,
  disabled,
  accessibilityLabel,
}: MastodonActionButtonProps) {
  const restingColor = useThemeColor({}, 'textTertiary');
  const color = !disabled && isActive ? activeColor : restingColor;
  const iconName = (isActive && activeIcon) || icon;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={spacing.sm}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.container,
        disabled && { opacity: opacity.disabled },
        pressed && !disabled && { opacity: activeOpacity.default },
      ]}
    >
      <IconSymbol name={iconName} size={20} color={color} />
      {typeof count === 'number' ? (
        <ThemedText style={[styles.count, { color }]}>
          {formatCompactNumber(count)}
        </ThemedText>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  count: {
    fontSize: fontSize.sm,
  },
});
