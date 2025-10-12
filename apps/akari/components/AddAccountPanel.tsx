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
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Panel } from '@/components/ui/Panel';
import { useDialogManager } from '@/contexts/DialogContext';
import { ADD_ACCOUNT_PANEL_ID } from '@/constants/dialogs';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSignIn } from '@/hooks/mutations/useSignIn';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

type AddAccountPanelProps = {
  panelId?: string;
};

const HANDLE_REGEX = /^@?[a-zA-Z0-9._-]+$/;

export function AddAccountPanel({ panelId = ADD_ACCOUNT_PANEL_ID }: AddAccountPanelProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const dialogManager = useDialogManager();
  const { data: currentAccount } = useCurrentAccount();

  const [handle, setHandle] = useState('');
  const [appPassword, setAppPassword] = useState('');

  const signInMutation = useSignIn();
  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();

  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const labelColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const iconColor = useThemeColor({ light: '#4B5563', dark: '#9CA3AF' }, 'icon');

  const isSubmitting =
    signInMutation.isPending || addAccountMutation.isPending || switchAccountMutation.isPending;

  const title = currentAccount ? t('common.addAccount') : t('auth.signInToBluesky');
  const description = currentAccount
    ? t('auth.addAnotherAccount')
    : t('auth.signInWithHandleAndPassword');

  const primaryActionLabel = useMemo(() => {
    if (isSubmitting) {
      return currentAccount ? t('auth.addingAccount') : t('auth.signingIn');
    }

    return currentAccount ? t('common.addAccount') : t('common.signIn');
  }, [currentAccount, isSubmitting, t]);

  const validateHandle = (value: string) => HANDLE_REGEX.test(value.replace('.bsky.social', ''));

  const handleDismiss = () => {
    if (isSubmitting) {
      return;
    }

    dialogManager.close(panelId);
  };

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

      showAlert({
        title: t('common.success'),
        message: currentAccount
          ? t('auth.accountAddedSuccessfully')
          : t('auth.signedInSuccessfully'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => {
              dialogManager.close(panelId);
              router.replace(
                currentAccount
                  ? '/(home,search,notifications,messages,post,profile)/settings'
                  : '/(home)'
              );
            },
          },
        ],
      });
    } catch (error) {
      showAlert({
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('auth.signInFailed'),
      });
    }
  };

  return (
    <Panel
      title={title}
      headerActions={
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          onPress={handleDismiss}
          disabled={isSubmitting}
          style={[styles.iconButton, isSubmitting ? styles.disabledButton : null]}
        >
          <IconSymbol name="xmark" size={18} color={iconColor} />
        </TouchableOpacity>
      }
      footerActions={
        <View style={styles.footerActions}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleDismiss}
            disabled={isSubmitting}
            style={[styles.secondaryButton, isSubmitting ? styles.disabledButton : null]}
          >
            <ThemedText style={styles.secondaryButtonText}>{t('common.cancel')}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[styles.primaryButton, isSubmitting ? styles.disabledPrimary : null]}
          >
            <ThemedText style={styles.primaryButtonText}>{primaryActionLabel}</ThemedText>
          </TouchableOpacity>
        </View>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoider}
      >
        <View style={styles.content}>
          <ThemedText style={[styles.description, { color: helperColor }]}>{description}</ThemedText>

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
        </View>
      </KeyboardAvoidingView>
    </Panel>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: {
    width: '100%',
  },
  content: {
    gap: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 14,
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledPrimary: {
    opacity: 0.6,
  },
  iconButton: {
    padding: 6,
    borderRadius: 999,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
