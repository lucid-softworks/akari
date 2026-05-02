import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getPdsUrlFromHandle } from '@/bluesky-api';
import { spacing, radius, fontSize, fontWeight, opacity, semanticColors, layout } from '@/constants/tokens';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSignIn } from '@/hooks/mutations/useSignIn';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';

type AuthMode = 'signin' | 'signup';

export default function AuthScreen() {
  const { data: currentAccount } = useCurrentAccount();
  const { t } = useTranslation();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [handle, setHandle] = useState('');
  const [appPassword, setAppPassword] = useState('');

  const signInMutation = useSignIn();
  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();

  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const labelColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const infoBackground = useThemeColor({ light: '#f8f9fa', dark: '#111827' }, 'background');
  const infoBorderColor = useThemeColor({ light: '#e1e5e9', dark: '#1F212D' }, 'border');

  const validateHandle = (value: string) => {
    const handleRegex = /^@?[a-zA-Z0-9._-]+$/;
    return handleRegex.test(value.replace('.bsky.social', ''));
  };

  const handleSignIn = async () => {
    if (!handle || !appPassword) {
      showAlert({
        title: t('common.error'),
        message: t('auth.fillAllFields'),
      });
      return;
    }

    if (!validateHandle(handle)) {
      showAlert({
        title: t('common.error'),
        message: t('auth.invalidBlueskyHandle'),
      });
      return;
    }

    try {
      const detectedPdsUrl = await getPdsUrlFromHandle(handle);

      if (!detectedPdsUrl) {
        showAlert({
          title: t('common.error'),
          message: 'Could not detect PDS server for this handle',
        });
        return;
      }

      const session = await signInMutation.mutateAsync({
        identifier: handle,
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

      router.replace(currentAccount ? '/settings' : '/index');
    } catch (error) {
      showAlert({
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('auth.signInFailed'),
      });
    }
  };

  const handleSignUp = async () => {
    if (!handle || !appPassword) {
      showAlert({
        title: t('common.error'),
        message: t('auth.fillAllFields'),
      });
      return;
    }

    if (!validateHandle(handle)) {
      showAlert({
        title: t('common.error'),
        message: t('auth.invalidBlueskyHandle'),
      });
      return;
    }

    try {
      const detectedPdsUrl = await getPdsUrlFromHandle(handle);

      if (!detectedPdsUrl) {
        showAlert({
          title: t('common.error'),
          message: 'Could not detect PDS server for this handle',
        });
        return;
      }

      const session = await signInMutation.mutateAsync({
        identifier: handle,
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

      router.replace('/index');
    } catch (error) {
      showAlert({
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('auth.connectionFailed'),
      });
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setHandle('');
    setAppPassword('');
  };

  const isSignUp = mode === 'signup';
  const isLoading = signInMutation.isPending;

  const submitAuth = () => {
    if (isLoading) {
      return;
    }

    if (isSignUp) {
      void handleSignUp();
      return;
    }

    void handleSignIn();
  };

  const primaryButtonLabel = useMemo(() => {
    if (isLoading) {
      if (currentAccount) {
        return t('auth.addingAccount');
      }

      return isSignUp ? t('auth.connecting') : t('auth.signingIn');
    }

    if (currentAccount) {
      return t('common.addAccount');
    }

    return isSignUp ? t('auth.connectAccount') : t('common.signIn');
  }, [currentAccount, isLoading, isSignUp, t]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
            <View style={styles.form}>
              <View style={styles.inputContainer}>
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
                  returnKeyType="done"
                  onSubmitEditing={submitAuth}
                />
                <ThemedText style={[styles.helperText, { color: helperColor }]}>
                  {t('auth.handleHelperText')}
                </ThemedText>
              </View>

              <View style={styles.inputContainer}>
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
                  returnKeyType="done"
                  onSubmitEditing={submitAuth}
                />
                <ThemedText style={[styles.helperText, { color: helperColor }]}>
                  {t('auth.appPasswordHelperText')}
                </ThemedText>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, isLoading ? styles.buttonDisabled : null]}
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={isLoading}
            >
              <ThemedText style={styles.primaryButtonText}>{primaryButtonLabel}</ThemedText>
            </TouchableOpacity>

            {!currentAccount && (
              <View style={styles.footerToggle}>
                <ThemedText style={styles.footerText}>
                  {isSignUp ? t('auth.alreadyConnected') : t('auth.needDifferentAccount')}
                </ThemedText>
                <TouchableOpacity onPress={toggleMode}>
                  <ThemedText style={styles.linkText}>
                    {isSignUp ? t('common.signIn') : t('auth.connectNew')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}

            <ThemedView
              style={[styles.infoSection, { backgroundColor: infoBackground, borderColor: infoBorderColor }]}
            >
              <ThemedText type="subtitle" style={styles.infoTitle}>
                {t('auth.howToGetAppPassword')}:
              </ThemedText>
              <ThemedText style={[styles.infoText, { color: helperColor }]}>
                {t('auth.appPasswordInstructions')}
              </ThemedText>
            </ThemedView>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    gap: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    width: '100%',
    maxWidth: 480,
  },
  form: {
    gap: spacing.xl,
  },
  inputContainer: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  input: {
    borderWidth: layout.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.lg,
  },
  helperText: {
    fontSize: fontSize.sm,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: semanticColors.systemBlue,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  buttonDisabled: {
    opacity: opacity.disabled,
  },
  footerToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: fontSize.base,
  },
  linkText: {
    fontSize: fontSize.base,
    color: semanticColors.systemBlue,
    fontWeight: fontWeight.semibold,
  },
  infoSection: {
    borderWidth: layout.border,
    borderRadius: radius.sm,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  infoTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  infoText: {
    fontSize: fontSize.base,
    lineHeight: 20,
  },
});
