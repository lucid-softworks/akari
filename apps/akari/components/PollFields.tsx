import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { activeOpacity, fontSize, fontWeight, hitSlop, layout, radius, semanticColors, spacing } from '@/constants/tokens';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { MAX_POLL_OPTIONS, MIN_POLL_OPTIONS } from '@/utils/postComposer/types';

export { MAX_POLL_OPTIONS, MIN_POLL_OPTIONS };

type PollFieldsProps = {
  options: string[];
  onChangeOptions: (options: string[]) => void;
  durationHours: number;
  onChangeDuration: (hours: number) => void;
};

/** The shared poll editor (answer options + voting duration). The question
 *  is the surrounding composer's post text, so it isn't included here. */
export function PollFields({ options, onChangeOptions, durationHours, onChangeDuration }: PollFieldsProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');

  const durations = [
    { hours: 6, label: t('poll.duration6Hours') },
    { hours: 24, label: t('poll.duration1Day') },
    { hours: 72, label: t('poll.duration3Days') },
    { hours: 168, label: t('poll.duration7Days') },
  ];

  const setOption = (index: number, value: string) => {
    onChangeOptions(options.map((opt, i) => (i === index ? value : opt)));
  };
  const addOption = () => {
    if (options.length < MAX_POLL_OPTIONS) onChangeOptions([...options, '']);
  };
  const removeOption = (index: number) => {
    if (options.length > MIN_POLL_OPTIONS) onChangeOptions(options.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.optionsList}>
        {options.map((opt, index) => (
          <Input
            // oxlint-disable-next-line react/no-array-index-key, react-doctor/no-array-index-as-key -- poll options have no stable id and are edited positionally (setOption / removeOption are keyed by index); keying by value would remount inputs on duplicate/empty options and drop focus mid-type
            key={index}
            value={opt}
            onChangeText={(v) => setOption(index, v)}
            placeholder={t('poll.optionPlaceholder', { number: index + 1 })}
            maxLength={100}
            suffix={
              options.length > MIN_POLL_OPTIONS ? (
                <Pressable
                  onPress={() => removeOption(index)}
                  hitSlop={hitSlop}
                  accessibilityRole="button"
                  accessibilityLabel={t('poll.removeOption')}
                >
                  <IconSymbol name="xmark" size={16} color={secondary} />
                </Pressable>
              ) : undefined
            }
          />
        ))}
      </View>

      {options.length < MAX_POLL_OPTIONS ? (
        <Pressable
          onPress={addOption}
          style={({ pressed }) => [styles.addOption, pressed && { opacity: activeOpacity.default }]}
          accessibilityRole="button"
        >
          <IconSymbol name="plus" size={16} color={semanticColors.systemBlue} />
          <ThemedText style={styles.addOptionText}>{t('poll.addOption')}</ThemedText>
        </Pressable>
      ) : null}

      <ThemedText style={[styles.sectionLabel, { color: secondary }]}>{t('poll.duration')}</ThemedText>
      <View style={styles.durationRow}>
        {durations.map(({ hours, label }) => {
          const active = hours === durationHours;
          return (
            <Pressable
              key={hours}
              onPress={() => onChangeDuration(hours)}
              style={({ pressed }) => [
                styles.durationChip,
                { borderColor },
                active && styles.durationChipActive,
                pressed && { opacity: activeOpacity.default },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <ThemedText style={[styles.durationChipText, active && styles.durationChipTextActive]}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  optionsList: {
    gap: spacing.sm,
  },
  addOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  addOptionText: {
    color: semanticColors.systemBlue,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xs,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  durationChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: layout.hairline,
  },
  durationChipActive: {
    backgroundColor: semanticColors.systemBlue,
    borderColor: semanticColors.systemBlue,
  },
  durationChipText: {
    fontSize: fontSize.sm,
  },
  durationChipTextActive: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
});
