import React, { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';

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
import { useRequestPasswordReset } from '@/hooks/mutations/useRequestPasswordReset';
import { useSession } from '@/hooks/queries/useSession';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function PasswordScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const accentColor = useThemeColor({ light: '#7C8CF9', dark: '#7C8CF9' }, 'tint');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const sessionQuery = useSession();
  const requestReset = useRequestPasswordReset();

  const handleReset = useCallback(() => {
    const email = sessionQuery.data?.email;
    if (!email) return;
    requestReset.mutate(email, {
      onSuccess: () => showToast({ type: 'success', message: t('settings.passwordResetSent') }),
      onError: () => showToast({ type: 'error', message: t('settings.passwordResetFailed') }),
    });
  }, [requestReset, sessionQuery.data?.email, showToast, t]);

  const disabled = !sessionQuery.data?.email || requestReset.isPending;

  return (
    <SettingsSubpageLayout title={t('settings.password')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedView style={[styles.introCard, { borderColor }]}>
          <ThemedText style={[styles.introText, { color: subduedColor }]}>
            {t('settings.passwordIntro')}
          </ThemedText>
        </ThemedView>

        <SettingsSection>
          <Pressable
            onPress={handleReset}
            disabled={disabled}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: accentColor },
              pressed && { opacity: activeOpacity.default },
              disabled && styles.disabled,
            ]}
            accessibilityRole="button"
          >
            <ThemedText style={styles.actionButtonText}>
              {t('settings.passwordRequestReset')}
            </ThemedText>
          </Pressable>
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
  actionButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.xl,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  disabled: { opacity: 0.5 },
});
