import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, layout, radius, semanticColors, spacing } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/useColorScheme';

type LabelProps = {
  /** The label text to display */
  text: string;
  /** Overrides the chip's accent colour entirely. Text is forced white. */
  color?: string;
  /** Whether this is a warning/negative label */
  isWarning?: boolean;
  /** Whether this is a positive/verified label */
  isPositive?: boolean;
  /** Tap handler — when provided, the chip becomes a Pressable. */
  onPress?: () => void;
  /** Avatar URL of the labeler that applied this label. When supplied,
   *  it replaces the per-kind glyph as the chip's leading icon. */
  labelerAvatar?: string;
};

// The chip palette is intentionally NOT routed through useThemeColor for
// bg/text — a previous version was, and any user-set background override on
// the Appearance screen flowed into every chip and made labels paint
// invisibly against the post. These values are tuned to read on both the
// new dark surfaces (#0b0c0e) and the default light bg.
const DARK = {
  warning: { fg: '#ff8a80', tint: 'rgba(209, 50, 50, 0.18)' },
  positive: { fg: '#a5d6a7', tint: 'rgba(63, 179, 127, 0.18)' },
  neutral: { fg: '#c8cad0', tint: 'rgba(154, 156, 163, 0.16)' },
} as const;
const LIGHT = {
  warning: { fg: '#b3261e', tint: 'rgba(209, 50, 50, 0.12)' },
  positive: { fg: '#1b5e20', tint: 'rgba(63, 179, 127, 0.18)' },
  neutral: { fg: '#374151', tint: 'rgba(75, 85, 99, 0.10)' },
} as const;

type LabelKind = 'warning' | 'positive' | 'neutral';

function iconFor(kind: LabelKind): React.ComponentProps<typeof IconSymbol>['name'] {
  if (kind === 'warning') return 'exclamationmark.triangle';
  if (kind === 'positive') return 'checkmark.seal';
  return 'info.circle';
}

/**
 * Compact moderation-label chip. Renders inline with the post body and the
 * profile header. When `onPress` is supplied (the common case), pressing
 * the chip opens the LabelDetailModal owned by the parent `<Labels>`
 * collection.
 */
export function Label({ text, color, isWarning, isPositive, onPress, labelerAvatar }: LabelProps) {
  const scheme = useColorScheme() ?? 'light';
  const kind: LabelKind = isWarning ? 'warning' : isPositive ? 'positive' : 'neutral';
  const palette = scheme === 'dark' ? DARK[kind] : LIGHT[kind];
  const fg = color ? '#ffffff' : palette.fg;
  const bg = color || palette.tint;
  const border = color || palette.fg;
  const Container = onPress ? Pressable : React.Fragment;
  // Stop the press from bubbling to a parent PressableLink (e.g. the
  // PostCard wrapper anchor on web) so tapping a label opens its detail
  // modal without also navigating to the post detail page.
  const wrappedPress = onPress
    ? (event: { stopPropagation?: () => void }) => {
        event?.stopPropagation?.();
        onPress();
      }
    : undefined;
  const containerProps = wrappedPress
    ? {
        onPress: wrappedPress,
        accessibilityRole: 'button' as const,
        accessibilityLabel: text,
        style: ({ pressed }: { pressed: boolean }) => [
          styles.chip,
          { backgroundColor: bg, borderColor: border },
          pressed && { opacity: 0.7 },
        ],
      }
    : ({} as Record<string, never>);

  const leadingGlyph = labelerAvatar ? (
    <View style={[styles.avatarFrame, { borderColor: border }]}>
      <Image source={{ uri: labelerAvatar }} style={styles.avatarImage} contentFit="cover" />
    </View>
  ) : (
    <IconSymbol name={iconFor(kind)} size={12} color={fg} />
  );

  const body = (
    <>
      {leadingGlyph}
      <ThemedText style={[styles.text, { color: fg }]}>{text}</ThemedText>
    </>
  );

  if (!onPress) {
    return <ThemedText style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>{body}</ThemedText>;
  }

  return <Container {...containerProps}>{body}</Container>;
}

// Re-exported for callers that want to centre their own copy on the same
// palette (eg. a label detail modal showing the same colour for the
// label's severity).
export { DARK as LABEL_PALETTE_DARK, LIGHT as LABEL_PALETTE_LIGHT };
export const labelSemantic = { danger: semanticColors.danger, repost: semanticColors.repost };

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: layout.hairline,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    lineHeight: 14,
  },
  avatarFrame: {
    width: 14,
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    borderWidth: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
