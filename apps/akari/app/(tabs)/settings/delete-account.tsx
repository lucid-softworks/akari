import { Redirect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Input } from '@/components/ui/Input';

import { SettingsSection } from '@/components/settings/SettingsList';
import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
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
import {
  useDeleteAccount,
  useRequestAccountDelete,
} from '@/hooks/mutations/useDeleteAccount';
import { useWipeAllData } from '@/hooks/mutations/useWipeAllData';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export default function DeleteAccountScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const dangerColor = useThemeColor({ light: '#DC2626', dark: '#F87171' }, 'text');
  const { t } = useTranslation();
  const { showToast } = useToast();

  const requestDelete = useRequestAccountDelete();
  const deleteAccount = useDeleteAccount();
  const wipeAllData = useWipeAllData();

  const [tokenSent, setTokenSent] = useState(false);
  const [emailToken, setEmailToken] = useState('');
  const [password, setPassword] = useState('');
  const [signedOut, setSignedOut] = useState(false);

  const handleRequestToken = useCallback(() => {
    requestDelete.mutate(undefined, {
      onSuccess: () => {
        setTokenSent(true);
        showToast({ type: 'success', message: t('settings.deleteAccountRequestSent') });
      },
      onError: () => {
        showToast({ type: 'error', message: t('settings.deleteAccountRequestFailed') });
      },
    });
  }, [requestDelete, showToast, t]);

  const handleConfirm = useCallback(() => {
    const token = emailToken.trim();
    const pwd = password;
    if (!token || !pwd) return;
    deleteAccount.mutate(
      { token, password: pwd },
      {
        onSuccess: async () => {
          try {
            await wipeAllData.mutateAsync();
          } catch {
            // ignore — destination is the sign-in screen regardless.
          }
          setSignedOut(true);
        },
        onError: () => {
          showToast({ type: 'error', message: t('settings.deleteAccountFailed') });
        },
      },
    );
  }, [deleteAccount, emailToken, password, showToast, t, wipeAllData]);

  if (signedOut) return <Redirect href="/(auth)/signin" />;

  const canConfirm = !!emailToken.trim() && !!password && !deleteAccount.isPending;

  return (
    <SettingsSubpageLayout title={t('settings.deleteAccount')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedView style={[styles.introCard, { borderColor: dangerColor }]}>
          <View style={styles.introHeader}>
            <IconSymbol name="exclamationmark.triangle.fill" size={18} color={dangerColor} />
            <ThemedText style={[styles.introHeading, { color: dangerColor }]}>
              {t('settings.deleteAccount')}
            </ThemedText>
          </View>
          <ThemedText style={[styles.introText, { color: subduedColor }]}>
            {t('settings.deleteAccountIntro')}
          </ThemedText>
        </ThemedView>

        <SettingsSection>
          <Pressable
            onPress={handleRequestToken}
            disabled={requestDelete.isPending}
            style={({ pressed }) => [
              styles.requestButton,
              { borderColor },
              pressed && { opacity: activeOpacity.default },
              requestDelete.isPending && styles.disabled,
            ]}
            accessibilityRole="button"
          >
            <ThemedText style={styles.requestButtonText}>
              {t('settings.deleteAccountRequest')}
            </ThemedText>
          </Pressable>
          {tokenSent ? (
            <ThemedText style={[styles.helperText, { color: subduedColor }]}>
              {t('settings.deleteAccountRequestSent')}
            </ThemedText>
          ) : null}
        </SettingsSection>

        <SettingsSection>
          <ThemedView style={[styles.sectionCard, { borderColor }]}>
            <View style={styles.formRow}>
              <Input
                variant="filled"
                containerStyle={styles.inputBox}
                value={emailToken}
                onChangeText={setEmailToken}
                placeholder={t('settings.deleteAccountTokenPlaceholder')}
                placeholderTextColor={subduedColor}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                variant="filled"
                containerStyle={styles.inputBox}
                value={password}
                onChangeText={setPassword}
                placeholder={t('settings.deleteAccountPasswordPlaceholder')}
                placeholderTextColor={subduedColor}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={handleConfirm}
                disabled={!canConfirm}
                style={({ pressed }) => [
                  styles.confirmButton,
                  { backgroundColor: dangerColor },
                  pressed && { opacity: activeOpacity.default },
                  !canConfirm && styles.disabled,
                ]}
                accessibilityRole="button"
              >
                <ThemedText style={styles.confirmButtonText}>
                  {t('settings.deleteAccountConfirmAction')}
                </ThemedText>
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
    borderRadius: radius.sm,
    gap: spacing.sm,
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  introHeading: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
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
  requestButton: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
  },
  requestButtonText: {
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
  inputBox: {
    borderRadius: radius.xs,
  },
  confirmButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.xs,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  disabled: { opacity: 0.5 },
});
