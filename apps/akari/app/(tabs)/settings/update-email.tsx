import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
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
import { useRequestEmailUpdate } from '@/hooks/mutations/useRequestEmailUpdate';
import { useUpdateEmail } from '@/hooks/mutations/useUpdateEmail';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function UpdateEmailScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const textColor = useThemeColor({}, 'text');
  const inputBackground = useThemeColor({ light: '#F3F4F6', dark: '#1F2937' }, 'background');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const requestToken = useRequestEmailUpdate();
  const update = useUpdateEmail();

  const [tokenSent, setTokenSent] = useState(false);
  const [tokenRequired, setTokenRequired] = useState(false);
  const [emailToken, setEmailToken] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const handleRequest = useCallback(() => {
    requestToken.mutate(undefined, {
      onSuccess: (res) => {
        setTokenSent(true);
        setTokenRequired(res.tokenRequired);
        if (res.tokenRequired) {
          showToast({ type: 'success', message: t('settings.updateEmailTokenSent') });
        }
      },
      onError: () => {
        showToast({ type: 'error', message: t('settings.updateEmailFailed') });
      },
    });
  }, [requestToken, showToast, t]);

  const handleSubmit = useCallback(() => {
    const email = newEmail.trim();
    const tokenInput = emailToken.trim();
    if (!email) return;
    update.mutate(
      { email, token: tokenRequired ? tokenInput : undefined },
      {
        onSuccess: () => {
          showToast({ type: 'success', message: t('settings.updateEmailSuccess') });
          router.back();
        },
        onError: () => {
          showToast({ type: 'error', message: t('settings.updateEmailFailed') });
        },
      },
    );
  }, [emailToken, newEmail, showToast, t, tokenRequired, update]);

  const canSubmit =
    !!newEmail.trim() && (!tokenRequired || !!emailToken.trim()) && !update.isPending;

  return (
    <SettingsSubpageLayout title={t('settings.updateEmail')}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={[styles.introCard, { borderColor }]}>
          <ThemedText style={[styles.introText, { color: subduedColor }]}>
            {t('settings.updateEmailIntro')}
          </ThemedText>
        </ThemedView>

        <SettingsSection>
          <Pressable
            onPress={handleRequest}
            disabled={requestToken.isPending}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor },
              pressed && { opacity: activeOpacity.default },
              requestToken.isPending && styles.disabled,
            ]}
            accessibilityRole="button"
          >
            <ThemedText style={styles.secondaryButtonText}>
              {t('settings.updateEmailRequestToken')}
            </ThemedText>
          </Pressable>
          {tokenSent ? (
            <ThemedText style={[styles.helperText, { color: subduedColor }]}>
              {t('settings.updateEmailTokenSent')}
            </ThemedText>
          ) : null}
        </SettingsSection>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.formRow}>
              <TextInput
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder={t('settings.updateEmailNewPlaceholder')}
                placeholderTextColor={subduedColor}
                style={[styles.input, { backgroundColor: inputBackground, color: textColor }]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              {tokenRequired ? (
                <TextInput
                  value={emailToken}
                  onChangeText={setEmailToken}
                  placeholder={t('settings.updateEmailTokenPlaceholder')}
                  placeholderTextColor={subduedColor}
                  style={[styles.input, { backgroundColor: inputBackground, color: textColor }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              ) : null}
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  { backgroundColor: accentColor },
                  pressed && { opacity: activeOpacity.default },
                  !canSubmit && styles.disabled,
                ]}
                accessibilityRole="button"
              >
                <ThemedText style={styles.submitButtonText}>
                  {t('settings.updateEmailSubmit')}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </SettingsSection>
      </ScrollView>
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
  secondaryButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
  },
  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  helperText: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    lineHeight: 16,
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
  submitButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.xs,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  disabled: { opacity: 0.5 },
});
