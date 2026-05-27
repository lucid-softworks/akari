import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { getPdsUrlFromHandle } from '@/bluesky-api';
import { ThemedText } from '@/components/ThemedText';
import { Input } from '@/components/ui/Input';
import { spacing, radius, fontSize, fontWeight, opacity, semanticColors } from '@/constants/tokens';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSignIn } from '@/hooks/mutations/useSignIn';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useConfirm } from '@/hooks/useConfirm';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

const HANDLE_REGEX = /^@?[a-zA-Z0-9._-]+$/;

type AddAccountFormProps = {
  /**
   * Called after the new account is added and switched-to. When set, the
   * form skips its default `router.replace('/(tabs)/settings')` so a
   * parent surface (e.g. a modal) can take over closure / navigation.
   */
  onSuccess?: () => void;
};

export function AddAccountForm({ onSuccess }: AddAccountFormProps = {}) {
  const { t } = useTranslation();
  const { replace } = useRouter();
  const { data: currentAccount } = useCurrentAccount();
  const confirm = useConfirm();

  const [handle, setHandle] = useState('');
  const [appPassword, setAppPassword] = useState('');

  const signInMutation = useSignIn();
  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();

  const labelColor = useThemeColor({}, 'text');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');

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
      confirm({
        title: t('common.error'),
        message: t('auth.fillAllFields'),
        buttons: [{ text: t('common.ok') }],
      });
      return;
    }

    if (!validateHandle(trimmedHandle)) {
      confirm({
        title: t('common.error'),
        message: t('auth.invalidBlueskyHandle'),
        buttons: [{ text: t('common.ok') }],
      });
      return;
    }

    try {
      const detectedPdsUrl = await getPdsUrlFromHandle(trimmedHandle);

      if (!detectedPdsUrl) {
        confirm({
          title: t('common.error'),
          message: 'Could not detect PDS server for this handle',
          buttons: [{ text: t('common.ok') }],
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
      if (onSuccess) {
        onSuccess();
      } else {
        replace((currentAccount ? '/(tabs)/settings' : '/') as never);
      }
    } catch (error) {
      confirm({
        buttons: [{ text: t('common.ok') }],
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
          <Input
            size="lg"
            value={handle}
            onChangeText={setHandle}
            placeholder={t('auth.blueskyHandlePlaceholder')}
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
          <Input
            size="lg"
            value={appPassword}
            onChangeText={setAppPassword}
            placeholder={t('auth.appPasswordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
          />
          <ThemedText style={[styles.helperText, { color: helperColor }]}>
            {t('auth.appPasswordHelperText')}
          </ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={({ pressed }) => [styles.primaryButton, isSubmitting ? styles.disabledPrimary : null, pressed && { opacity: 0.7 }]}
        >
          <ThemedText style={styles.primaryButtonText}>{primaryActionLabel}</ThemedText>
        </Pressable>
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
