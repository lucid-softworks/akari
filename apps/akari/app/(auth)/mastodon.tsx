import { AppLogo } from '@/components/AppLogo';
import { Redirect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, layout, opacity, radius, semanticColors, spacing } from '@/constants/tokens';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useConfirm } from '@/hooks/useConfirm';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { mastodonSignIn } from '@/utils/mastodon/signIn';

/**
 * Mastodon / fediverse sign-in entry screen. The user types their server
 * domain; we run the OAuth flow (`mastodonSignIn`), persist the account, and
 * land on the home tab. Mirrors `oauth.tsx` minus the atproto typeahead —
 * fediverse accounts are addressed by server domain, not a resolvable handle.
 */
export default function MastodonSignInScreen() {
  const { t } = useTranslation();
  const confirm = useConfirm();

  const [instance, setInstance] = useState('');
  const [signInInFlight, setSignInInFlight] = useState(false);
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();

  const trimmed = instance.trim();
  const canSubmit = trimmed.length > 0;

  const labelColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const screenBackground = useThemeColor({}, 'background');

  // Auto-focus the input on mount; users come here specifically to type a domain.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = useCallback(async () => {
    if (!canSubmit || signInInFlight) return;
    inputRef.current?.blur();
    setSignInInFlight(true);
    try {
      // Strictly sequential: each step consumes the previous result
      // (sign-in → persist → activate), so they can't run in parallel.
      // oxlint-disable-next-line react-doctor/async-parallel -- dependent steps, not independent
      const { account } = await mastodonSignIn(trimmed);
      const newAccount = await addAccountMutation.mutateAsync(account);
      await switchAccountMutation.mutateAsync(newAccount);
      setRedirectAfterAuth('/');
    } catch (error) {
      confirm({
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('auth.signInFailed'),
        buttons: [{ text: t('common.ok') }],
      });
    } finally {
      setSignInInFlight(false);
    }
  }, [addAccountMutation, canSubmit, confirm, signInInFlight, switchAccountMutation, t, trimmed]);

  if (redirectAfterAuth) {
    return <Redirect href={redirectAfterAuth as never} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: screenBackground }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            <AppLogo style={styles.logo} />
            <ThemedText type="title" style={styles.title}>
              {t('auth.mastodonScreenTitle')}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: helperColor }]}>
              {t('auth.mastodonScreenSubtitle')}
            </ThemedText>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={[styles.label, { color: labelColor }]}>
              {t('auth.mastodonInstance')}
            </ThemedText>
            <TextInput
              ref={inputRef}
              style={[styles.input, { borderColor, backgroundColor: inputBackground, color: labelColor }]}
              value={instance}
              onChangeText={setInstance}
              placeholder={t('auth.mastodonInstancePlaceholder')}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleContinue}
            />
            <ThemedText style={[styles.helper, { color: helperColor }]}>
              {t('auth.mastodonInstanceHelp')}
            </ThemedText>
          </View>

          <Pressable
            style={[styles.primaryButton, (!canSubmit || signInInFlight) ? styles.buttonDisabled : null]}
            onPress={handleContinue}
            disabled={!canSubmit || signInInFlight}
            accessibilityRole="button"
          >
            <ThemedText style={styles.primaryButtonText}>
              {signInInFlight ? t('auth.oauthInFlight') : t('auth.continue')}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.base,
    lineHeight: 22,
    textAlign: 'center',
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
  helper: {
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
});
