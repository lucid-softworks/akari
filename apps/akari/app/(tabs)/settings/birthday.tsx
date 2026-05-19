import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  layout,
  radius,
  spacing,
} from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useUpdatePersonalDetails } from '@/hooks/mutations/useUpdatePersonalDetails';
import { usePersonalDetails } from '@/hooks/queries/usePersonalDetails';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const ISO_DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

function toIsoDateOnly(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (!ISO_DATE_RX.test(trimmed)) return null;
  const date = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return trimmed;
}

export default function BirthdayScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const textColor = useThemeColor({}, 'text');
  const inputBackground = useThemeColor({ light: '#F3F4F6', dark: '#1F2937' }, 'background');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const personalDetails = usePersonalDetails();
  const update = useUpdatePersonalDetails();

  const [draft, setDraft] = useState('');

  // Pre-fill once preferences land. atproto stores the birthday as a
  // full ISO timestamp; we trim to YYYY-MM-DD for the picker so the
  // input matches the prompt format.
  useEffect(() => {
    if (!personalDetails.birthDate) return;
    setDraft(personalDetails.birthDate.slice(0, 10));
  }, [personalDetails.birthDate]);

  const handleSave = useCallback(() => {
    const value = toIsoDateOnly(draft);
    if (value === null) {
      showToast({ type: 'error', message: t('settings.birthdaySaveFailed') });
      return;
    }
    update.mutate(
      { birthDate: value === '' ? undefined : value },
      {
        onSuccess: () => router.back(),
        onError: () => showToast({ type: 'error', message: t('settings.birthdaySaveFailed') }),
      },
    );
  }, [draft, showToast, t, update]);

  const handleClear = useCallback(() => {
    setDraft('');
  }, []);

  return (
    <SettingsSubpageLayout title={t('settings.birthday')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={[styles.introCard, { borderColor }]}>
          <ThemedText style={[styles.introText, { color: subduedColor }]}>
            {t('settings.birthdayIntro')}
          </ThemedText>
        </ThemedView>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.formRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t('settings.birthdayPlaceholder')}
                placeholderTextColor={subduedColor}
                style={[styles.input, { backgroundColor: inputBackground, color: textColor }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.buttonRow}>
                <Pressable
                  onPress={handleClear}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor },
                    pressed && { opacity: activeOpacity.default },
                  ]}
                  accessibilityRole="button"
                >
                  <ThemedText style={styles.secondaryButtonText}>
                    {t('settings.birthdayClear')}
                  </ThemedText>
                </Pressable>
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
                  <ThemedText style={styles.saveButtonText}>{t('common.save')}</ThemedText>
                </Pressable>
              </View>
            </View>
          </ThemedView>
        </SettingsSection>
      </SettingsScroll>
    </SettingsSubpageLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: spacing.xxl },
  introCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: layout.hairline,
  },
  introText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  formRow: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    fontSize: fontSize.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: layout.hairline,
    borderRadius: radius.xs,
  },
  secondaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.xs,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  disabled: { opacity: 0.5 },
});
