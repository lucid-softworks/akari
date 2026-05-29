import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, radius, spacing } from '@/constants/tokens';
import { ACTION_OPTIONS, type OzoneActionType } from '@/components/moderation/ozoneActions';

/**
 * The action-type chip grid plus the active option's description. Destructive
 * chips read in red whether active or inactive — inactive uses red text + a
 * red-tinted border so the option is recognisable before you tap it; active
 * uses a stronger red background to match the submit button.
 */
export function ActionPicker({
  action,
  onSelect,
  borderColor,
  secondary,
  tint,
  dangerColor,
}: {
  action: OzoneActionType;
  onSelect: (next: OzoneActionType) => void;
  borderColor: string;
  secondary: string;
  tint: string;
  dangerColor: string;
}) {
  return (
    <>
      <View style={styles.actionGrid}>
        {ACTION_OPTIONS.map((opt) => {
          const active = opt.id === action;
          const accent = opt.destructive ? dangerColor : tint;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onSelect(opt.id)}
              style={[
                styles.actionChip,
                { borderColor: opt.destructive ? `${accent}66` : borderColor },
                active && { borderColor: accent, backgroundColor: `${accent}20` },
              ]}
            >
              <ThemedText
                style={[
                  styles.actionChipLabel,
                  opt.destructive ? { color: accent } : null,
                  active ? { color: accent, fontWeight: fontWeight.semibold } : null,
                ]}
              >
                {opt.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <ThemedText style={[styles.helper, { color: secondary }]}>
        {ACTION_OPTIONS.find((o) => o.id === action)?.description}
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  actionChipLabel: {
    fontSize: fontSize.sm,
  },
  helper: {
    fontSize: fontSize.sm,
    marginTop: 2,
    lineHeight: 18,
  },
});
