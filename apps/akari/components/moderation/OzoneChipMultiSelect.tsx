import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Multi-select chip row. Renders one toggle per option, syncing selection
 * into a Set so the caller can preserve insertion order without re-
 * deriving each render.
 */
export function ChipMultiSelect({
  options,
  selected,
  onChange,
  borderColor,
  secondary,
  tint,
}: {
  options: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  borderColor: string;
  secondary: string;
  tint: string;
}) {
  const { t } = useTranslation();
  if (options.length === 0) {
    return (
      <ThemedText style={[styles.helper, { color: secondary }]}>
        {t('moderation.actionSheet.noLabelOptions')}
      </ThemedText>
    );
  }
  return (
    <View style={styles.actionGrid}>
      {options.map((opt) => {
        const isOn = selected.has(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => {
              const next = new Set(selected);
              if (isOn) next.delete(opt);
              else next.add(opt);
              onChange(next);
            }}
            style={[
              styles.actionChip,
              { borderColor: isOn ? tint : borderColor, backgroundColor: isOn ? `${tint}20` : 'transparent' },
            ]}
          >
            <ThemedText
              style={[
                styles.actionChipLabel,
                isOn ? { color: tint, fontWeight: fontWeight.semibold } : null,
              ]}
            >
              {opt}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
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
