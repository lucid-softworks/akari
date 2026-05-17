import { Pressable, StyleSheet, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

export type Threshold = 30 | 90 | 180 | 365 | 'never';

const THRESHOLD_OPTIONS: Threshold[] = [30, 90, 180, 365, 'never'];

export type ThresholdPickerProps = {
  threshold: Threshold;
  onChange: (threshold: Threshold) => void;
  borderColor: string;
  tintColor: string;
  textColor: string;
};

export function ThresholdPicker({
  threshold,
  onChange,
  borderColor,
  tintColor,
  textColor,
}: ThresholdPickerProps) {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t('settings.followingCleanup.thresholdHeader')}>
      <ThemedView style={[styles.sectionCard, { borderColor }]}>
        <View style={styles.pillRow}>
          {THRESHOLD_OPTIONS.map((option) => {
            const isActive = threshold === option;
            const label =
              option === 'never'
                ? t('settings.followingCleanup.thresholdNever')
                : t('settings.followingCleanup.thresholdDays', { count: option });
            return (
              <Pressable
                key={String(option)}
                onPress={() => onChange(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                style={({ pressed }) => [
                  styles.pill,
                  { borderColor: isActive ? tintColor : borderColor },
                  isActive && { backgroundColor: tintColor },
                  pressed && { opacity: activeOpacity.default },
                ]}
              >
                <ThemedText
                  style={[styles.pillText, { color: isActive ? '#FFFFFF' : textColor }]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ThemedView>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
  },
  pill: {
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
