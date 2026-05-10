import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  layout,
  radius,
  spacing,
} from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useUpdateThreadPreferences } from '@/hooks/mutations/useUpdateThreadPreferences';
import {
  useThreadPreferences,
  type ThreadSort,
} from '@/hooks/queries/useThreadPreferences';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const SORT_OPTIONS: { value: ThreadSort; labelKey: string }[] = [
  { value: 'hotness', labelKey: 'settings.threadPreferencesSortHotness' },
  { value: 'oldest', labelKey: 'settings.threadPreferencesSortOldest' },
  { value: 'newest', labelKey: 'settings.threadPreferencesSortNewest' },
  { value: 'most-likes', labelKey: 'settings.threadPreferencesSortMostLikes' },
  { value: 'random', labelKey: 'settings.threadPreferencesSortRandom' },
];

export default function ThreadPreferencesScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const textColor = useThemeColor({}, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const settings = useThreadPreferences();
  const update = useUpdateThreadPreferences();

  const [sort, setSort] = useState<ThreadSort>(settings.data.sort);
  const [prioritise, setPrioritise] = useState<boolean>(settings.data.prioritizeFollowedUsers);

  // Pre-fill once preferences land. Local edits stick until Save.
  useEffect(() => {
    setSort(settings.data.sort);
    setPrioritise(settings.data.prioritizeFollowedUsers);
  }, [settings.data]);

  const handleSave = useCallback(() => {
    update.mutate(
      { sort, prioritizeFollowedUsers: prioritise },
      {
        onSuccess: () => router.back(),
        onError: () =>
          showToast({ type: 'error', message: t('settings.threadPreferencesSaveFailed') }),
      },
    );
  }, [prioritise, showToast, sort, t, update]);

  return (
    <SettingsSubpageLayout title={t('settings.threadPreferences')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedText style={[styles.intro, { color: subduedColor }]}>
          {t('settings.threadPreferencesIntro')}
        </ThemedText>

        <SettingsSection title={t('settings.threadPreferencesSort')}>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            {SORT_OPTIONS.map((option, index) => {
              const isSelected = sort === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setSort(option.value)}
                  style={({ pressed }) => [
                    styles.row,
                    index < SORT_OPTIONS.length - 1 && {
                      borderBottomColor: borderColor,
                      borderBottomWidth: layout.hairline,
                    },
                    pressed && { opacity: activeOpacity.default },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: isSelected ? accentColor : borderColor,
                        backgroundColor: isSelected ? accentColor : 'transparent',
                      },
                    ]}
                  />
                  <ThemedText style={[styles.rowLabel, { color: textColor }]}>
                    {t(option.labelKey as 'settings.threadPreferencesSortHotness')}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        </SettingsSection>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelWrap}>
                <ThemedText style={[styles.rowLabel, { color: textColor }]}>
                  {t('settings.threadPreferencesPrioritise')}
                </ThemedText>
              </View>
              <Switch value={prioritise} onValueChange={setPrioritise} />
            </View>
          </ThemedView>
        </SettingsSection>

        <Pressable
          onPress={handleSave}
          disabled={update.isPending}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: accentColor },
            pressed && { opacity: activeOpacity.default },
            update.isPending && styles.disabled,
          ]}
          accessibilityRole="button"
        >
          <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
          <ThemedText style={styles.saveButtonText}>{t('common.save')}</ThemedText>
        </Pressable>
      </ScrollView>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: spacing.xxl },
  intro: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  rowLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  toggleLabelWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  saveButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  disabled: {
    opacity: 0.5,
  },
});
