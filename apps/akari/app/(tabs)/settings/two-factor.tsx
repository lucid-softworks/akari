import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { SettingsSubpageLayout } from '@/components/settings/SettingsSubpageLayout';
import { SettingsScroll } from '@/components/settings/SettingsScroll';
import { SettingsSection } from '@/components/settings/SettingsList';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  layout,
  radius,
  semanticColors,
  spacing,
} from '@/constants/tokens';
import { useToast } from '@/contexts/ToastContext';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { useSession } from '@/hooks/queries/useSession';
import { queryKeys } from '@/hooks/queryKeys';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { apiForAccount } from '@/utils/blueskyApi';

export default function TwoFactorScreen() {
  const borderColor = useBorderColor();
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'tint');
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const { data: session, isLoading: sessionLoading } = useSession();

  const [token2fa, setToken2fa] = useState('');
  const [tokenSent, setTokenSent] = useState(false);

  const requestToken = useMutation({
    mutationFn: async () => {
      if (!token || !currentAccount) throw new Error('No active session');
      const api = apiForAccount(currentAccount);
      await api.requestEmailConfirmation(token);
    },
    onSuccess: () => {
      setTokenSent(true);
      showToast({ type: 'success', message: t('settings.twoFactorTokenSent') });
    },
    onError: () => showToast({ type: 'error', message: t('common.somethingWentWrong') }),
  });

  const confirm = useMutation({
    mutationFn: async () => {
      if (!token || !currentAccount) throw new Error('No active session');
      if (!session?.email) throw new Error('No email on account');
      const api = apiForAccount(currentAccount);
      await api.confirmEmail(token, session.email, token2fa.trim());
    },
    onSuccess: () => {
      setToken2fa('');
      setTokenSent(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      showToast({ type: 'success', message: t('settings.twoFactorEnabledToast') });
    },
    onError: () => showToast({ type: 'error', message: t('settings.twoFactorInvalidToken') }),
  });

  const isEnabled = !!session?.emailAuthFactor;
  const emailConfirmed = !!session?.emailConfirmed;

  return (
    <SettingsSubpageLayout title={t('settings.twoFactor')}>
      <SettingsScroll
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <ThemedText style={[styles.intro, { color: subduedColor }]}>
          {t('settings.twoFactorIntro')}
        </ThemedText>

        <SettingsSection>
          <ThemedView style={[styles.statusCard, { borderColor }]}>
            <IconSymbol
              name={isEnabled ? 'checkmark.shield.fill' : 'shield'}
              size={28}
              color={isEnabled ? accentColor : subduedColor}
            />
            <View style={styles.statusBody}>
              <ThemedText style={[styles.statusLabel, { color: textColor }]}>
                {isEnabled ? t('settings.twoFactorOn') : t('settings.twoFactorOff')}
              </ThemedText>
              {session?.email ? (
                <ThemedText style={[styles.statusEmail, { color: subduedColor }]}>
                  {session.email}
                </ThemedText>
              ) : null}
            </View>
          </ThemedView>
        </SettingsSection>

        {sessionLoading ? null : isEnabled ? (
          <ThemedText style={[styles.helper, { color: subduedColor }]}>
            {t('settings.twoFactorDisableHint')}
          </ThemedText>
        ) : !emailConfirmed ? (
          <ThemedText style={[styles.helper, { color: subduedColor }]}>
            {t('settings.twoFactorRequiresEmailConfirmation')}
          </ThemedText>
        ) : (
          <>
            <Pressable
              onPress={() => requestToken.mutate()}
              disabled={requestToken.isPending}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: accentColor },
                pressed && { opacity: activeOpacity.default },
                requestToken.isPending && styles.disabled,
              ]}
              accessibilityRole="button"
            >
              <ThemedText style={styles.primaryButtonText}>
                {tokenSent
                  ? t('settings.twoFactorResendToken')
                  : t('settings.twoFactorSendToken')}
              </ThemedText>
            </Pressable>

            {tokenSent ? (
              <SettingsSection title={t('settings.twoFactorEnterToken')}>
                <ThemedView style={[styles.sectionCard, { borderColor }]}>
                  <View style={styles.tokenRow}>
                    <Input
                      value={token2fa}
                      onChangeText={setToken2fa}
                      placeholder={t('settings.twoFactorTokenPlaceholder')}
                      placeholderTextColor={subduedColor}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      containerStyle={styles.tokenInputBox}
                    />
                    <Pressable
                      onPress={() => confirm.mutate()}
                      disabled={confirm.isPending || token2fa.trim().length === 0}
                      style={({ pressed }) => [
                        styles.confirmButton,
                        { backgroundColor: accentColor },
                        (confirm.isPending || token2fa.trim().length === 0) && styles.disabled,
                        pressed && { opacity: activeOpacity.default },
                      ]}
                      accessibilityRole="button"
                    >
                      <ThemedText style={styles.confirmButtonText}>
                        {t('settings.twoFactorConfirm')}
                      </ThemedText>
                    </Pressable>
                  </View>
                </ThemedView>
              </SettingsSection>
            ) : null}
          </>
        )}
      </SettingsScroll>
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
  helper: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderWidth: layout.hairline,
    borderRadius: radius.md,
  },
  statusBody: { flex: 1, gap: 2 },
  statusLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  statusEmail: { fontSize: fontSize.sm },
  primaryButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: layout.hairline,
    backgroundColor: 'transparent',
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  tokenInputBox: { flex: 1 },
  confirmButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  confirmButtonText: { color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  disabled: { opacity: 0.5 },
});
