import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Input } from '@/components/ui/Input';

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
import { useUpdateHandle } from '@/hooks/mutations/useUpdateHandle';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function HandleSettingsScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const { data: currentAccount } = useCurrentAccount();
  const update = useUpdateHandle();

  const [draft, setDraft] = useState(currentAccount?.handle ?? '');

  const handleSave = useCallback(() => {
    const handle = draft.trim();
    if (!handle || handle === currentAccount?.handle) return;
    update.mutate(handle, {
      onSuccess: () => {
        router.back();
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : '';
        showToast({
          type: 'error',
          message: t('settings.handleSaveFailed', { message }),
        });
      },
    });
  }, [currentAccount?.handle, draft, showToast, t, update]);

  const isDirty = draft.trim().length > 0 && draft.trim() !== currentAccount?.handle;

  return (
    <SettingsSubpageLayout title={t('settings.handle')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={[styles.introCard, { borderColor }]}>
          <ThemedText style={[styles.introText, { color: subduedColor }]}>
            {t('settings.handleIntro')}
          </ThemedText>
        </ThemedView>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.formRow}>
              <Input
                variant="filled"
                containerStyle={styles.inputBox}
                value={draft}
                onChangeText={setDraft}
                placeholder={t('settings.handlePlaceholder')}
                placeholderTextColor={subduedColor}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <Pressable
                onPress={handleSave}
                disabled={!isDirty || update.isPending}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: accentColor },
                  pressed && { opacity: activeOpacity.default },
                  (!isDirty || update.isPending) && styles.disabled,
                ]}
                accessibilityRole="button"
              >
                <ThemedText style={styles.saveButtonText}>{t('common.save')}</ThemedText>
              </Pressable>
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
    padding: spacing.md,
    borderWidth: layout.hairline,
  },
  introText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  formRow: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  inputBox: {
    flex: 1,
    borderRadius: radius.xs,
  },
  saveButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.xs,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  disabled: { opacity: 0.5 },
});
