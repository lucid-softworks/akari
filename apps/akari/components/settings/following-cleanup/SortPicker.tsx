import { Pressable, StyleSheet, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { activeOpacity, fontSize, fontWeight, layout, radius, spacing } from '@/constants/tokens';
import { useTranslation } from '@/hooks/useTranslation';

export type SortMode = 'lastActivity' | 'followedAt' | 'fewestPosts' | 'mostFollowers';

const SORT_OPTIONS: SortMode[] = ['lastActivity', 'followedAt', 'fewestPosts', 'mostFollowers'];

export type SortPickerProps = {
  sortMode: SortMode;
  onChange: (mode: SortMode) => void;
  borderColor: string;
  tintColor: string;
  textColor: string;
};

export function SortPicker({
  sortMode,
  onChange,
  borderColor,
  tintColor,
  textColor,
}: SortPickerProps) {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t('settings.followingCleanup.sortHeader')}>
      <ThemedView style={[styles.sectionCard, { borderColor }]}>
        <View style={styles.pillRow}>
          {SORT_OPTIONS.map((option) => {
            const isActive = sortMode === option;
            return (
              <Pressable
                key={option}
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
                  {t(`settings.followingCleanup.sort.${option}`)}
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
