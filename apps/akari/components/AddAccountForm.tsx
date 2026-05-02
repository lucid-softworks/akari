import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { getPdsUrlFromHandle } from '@/bluesky-api';
import { ThemedText } from '@/components/ThemedText';
import { spacing, radius, fontSize, fontWeight, opacity, semanticColors, layout } from '@/constants/tokens';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSignIn } from '@/hooks/mutations/useSignIn';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

const HANDLE_REGEX = /^@?[a-zA-Z0-9._-]+$/;

export function AddAccountForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: currentAccount } = useCurrentAccount();

  const [handle, setHandle] = useState('');
  const [appPassword, setAppPassword] = useState('');

  const signInMutation = useSignIn();
  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();

  const borderColor = useThemeColor({}, 'border');
  const labelColor = useThemeColor({}, 'text');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const inputBackground = useThemeColor({ light: '#f9fafb', dark: '#2a2a2e' }, 'background');

  const isSubmitting =
    signInMutation.isPending || addAccountMutation.isPending || switchAccountMutation.isPending;

  const primaryActionLabel = useMemo(() => {
    if (isSubmitting) {
      return currentAccount ? t('auth.addingAccount') : t('auth.signingIn');
    }

    return currentAccount ? t('common.addAccount') : t('common.signIn');
  }, [currentAccount, isSubmitting, t]);

  const validateHandle = (value: string) => HANDLE_REGEX.test(value.replace('.bsky.social', ''));

  const handleSubmit = async () => {
    const trimmedHandle = handle.trim();

    if (!trimmedHandle || !appPassword) {
      showAlert({
        title: t('common.error'),
        message: t('auth.fillAllFields'),
      });
      return;
    }

    if (!validateHandle(trimmedHandle)) {
      showAlert({
        title: t('common.error'),
        message: t('auth.invalidBlueskyHandle'),
      });
      return;
    }

    try {
      const detectedPdsUrl = await getPdsUrlFromHandle(trimmedHandle);

      if (!detectedPdsUrl) {
        showAlert({
          title: t('common.error'),
          message: 'Could not detect PDS server for this handle',
        });
        return;
      }

      const session = await signInMutation.mutateAsync({
        identifier: trimmedHandle,
        password: appPassword,
        pdsUrl: detectedPdsUrl,
      });

      const profile = session.profile;

      const newAccount = await addAccountMutation.mutateAsync({
        did: session.did,
        handle: session.handle,
        displayName: profile?.displayName ?? session.handle,
        avatar: profile?.avatar ?? undefined,
        jwtToken: session.accessJwt,
        refreshToken: session.refreshJwt,
        pdsUrl: detectedPdsUrl,
      });

      await switchAccountMutation.mutateAsync(newAccount);

      setHandle('');
      setAppPassword('');
      router.replace(currentAccount ? '/settings' : '/index');
    } catch (error) {
      showAlert({
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('auth.signInFailed'),
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardAvoider}
    >
      <View style={styles.content}>
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: labelColor }]}>{t('auth.blueskyHandle')}</ThemedText>
          <TextInput
            style={[styles.input, { borderColor, backgroundColor: inputBackground, color: labelColor }]}
            value={handle}
            onChangeText={setHandle}
            placeholder={t('auth.blueskyHandlePlaceholder')}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
          />
          <ThemedText style={[styles.helperText, { color: helperColor }]}>
            {t('auth.handleHelperText')}
          </ThemedText>
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: labelColor }]}>{t('auth.appPassword')}</ThemedText>
          <TextInput
            style={[styles.input, { borderColor, backgroundColor: inputBackground, color: labelColor }]}
            value={appPassword}
            onChangeText={setAppPassword}
            placeholder={t('auth.appPasswordPlaceholder')}
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
          />
          <ThemedText style={[styles.helperText, { color: helperColor }]}>
            {t('auth.appPasswordHelperText')}
          </ThemedText>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.primaryButton, isSubmitting ? styles.disabledPrimary : null]}
        >
          <ThemedText style={styles.primaryButtonText}>{primaryActionLabel}</ThemedText>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: {
    width: '100%',
  },
  content: {
    gap: spacing.xl,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  helperText: {
    fontSize: fontSize.sm,
  },
  input: {
    borderWidth: layout.border,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    fontSize: fontSize.lg,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  secondaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: fontSize.base,
  },
  primaryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: semanticColors.systemBlue,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  disabledPrimary: {
    opacity: opacity.disabled,
  },
  iconButton: {
    padding: 6,
    borderRadius: radius.full,
  },
  disabledButton: {
    opacity: opacity.tertiary,
  },
});
