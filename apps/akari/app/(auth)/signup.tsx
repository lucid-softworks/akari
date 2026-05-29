import { Redirect, router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
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
import { AuthHeader } from '@/components/auth/AuthHeader';
import { SignupFields } from '@/components/auth/SignupFields';
import { type MenuItem } from '@/components/ui/Menu';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  opacity,
  radius,
  semanticColors,
  spacing,
} from '@/constants/tokens';
import { useCreateAccount } from '@/hooks/useCreateAccount';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import {
  DEFAULT_SIGNUP_PROVIDER,
  SIGNUP_PROVIDER_ORDER,
  SIGNUP_PROVIDERS,
  type SignupProviderId,
} from '@/utils/signupProviders';

export default function SignupScreen() {
  const { t } = useTranslation();
  const { createAccount, redirectAfterAuth, isLoading, hasCurrentAccount } = useCreateAccount();

  const [provider, setProvider] = useState<SignupProviderId>(DEFAULT_SIGNUP_PROVIDER);
  const [handleSuffix, setHandleSuffix] = useState<string>(
    DEFAULT_SIGNUP_PROVIDER === 'custom'
      ? ''
      : SIGNUP_PROVIDERS[DEFAULT_SIGNUP_PROVIDER].handleSuffixes[0],
  );
  const [customPdsUrl, setCustomPdsUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteCode, setShowInviteCode] = useState(false);

  // When the user switches PDS, reset the suffix. Custom has no suffix
  // (the user types a full handle); preset providers snap back to their
  // canonical first-listed suffix.
  const handleProviderChange = (next: SignupProviderId) => {
    setProvider(next);
    if (next === 'custom') {
      setHandleSuffix('');
    } else {
      setHandleSuffix(SIGNUP_PROVIDERS[next].handleSuffixes[0]);
    }
  };

  const passwordInputRef = useRef<TextInput>(null);
  const handleInputRef = useRef<TextInput>(null);
  const inviteInputRef = useRef<TextInput>(null);
  const customPdsUrlInputRef = useRef<TextInput>(null);

  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const labelColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const screenBackground = useThemeColor({}, 'background');

  const isCustom = provider === 'custom';
  const suffixes = useMemo(
    () => (isCustom ? [] : SIGNUP_PROVIDERS[provider].handleSuffixes),
    [isCustom, provider],
  );
  const hasSuffixChoice = suffixes.length > 1;

  const providerItems: readonly MenuItem[] = useMemo(
    () =>
      SIGNUP_PROVIDER_ORDER.map((id) => ({
        key: id,
        label: id === 'custom' ? t('auth.signupProviderCustom') : SIGNUP_PROVIDERS[id].label,
        selected: id === provider,
        onPress: () => handleProviderChange(id),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, provider],
  );

  const suffixItems: readonly MenuItem[] = useMemo(
    () =>
      suffixes.map((suffix) => ({
        key: suffix,
        label: suffix,
        selected: suffix === handleSuffix,
        onPress: () => setHandleSuffix(suffix),
      })),
    [suffixes, handleSuffix],
  );

  const submit = () => {
    if (isLoading) return;
    if (isCustom) {
      void createAccount({
        provider: 'custom',
        email,
        password,
        handle,
        pdsUrl: customPdsUrl,
        inviteCode: showInviteCode ? inviteCode : undefined,
      });
    } else {
      void createAccount({
        provider,
        email,
        password,
        handle,
        handleSuffix,
        inviteCode: showInviteCode ? inviteCode : undefined,
      });
    }
  };

  const providerDisplayLabel =
    provider === 'custom' ? t('auth.signupProviderCustom') : SIGNUP_PROVIDERS[provider].label;

  const primaryButtonLabel = useMemo(() => {
    if (isLoading) return t('auth.signupCreating');
    return t('auth.signupSubmit');
  }, [isLoading, t]);

  if (redirectAfterAuth) {
    return <Redirect href={redirectAfterAuth as never} />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: screenBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <AuthHeader
            helperColor={helperColor}
            title={t('auth.signupScreenTitle')}
            subtitle={t('auth.signupScreenSubtitle')}
          />

          <SignupFields
            isCustom={isCustom}
            hasSuffixChoice={hasSuffixChoice}
            handleSuffix={handleSuffix}
            suffixItems={suffixItems}
            providerItems={providerItems}
            providerDisplayLabel={providerDisplayLabel}
            customPdsUrl={customPdsUrl}
            onChangeCustomPdsUrl={setCustomPdsUrl}
            email={email}
            onChangeEmail={setEmail}
            password={password}
            onChangePassword={setPassword}
            handle={handle}
            onChangeHandle={setHandle}
            inviteCode={inviteCode}
            onChangeInviteCode={setInviteCode}
            showInviteCode={showInviteCode}
            onShowInviteCode={() => setShowInviteCode(true)}
            onSubmit={submit}
            passwordInputRef={passwordInputRef}
            handleInputRef={handleInputRef}
            inviteInputRef={inviteInputRef}
            customPdsUrlInputRef={customPdsUrlInputRef}
            borderColor={borderColor}
            labelColor={labelColor}
            helperColor={helperColor}
            inputBackground={inputBackground}
          />

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              isLoading ? styles.buttonDisabled : null,
              pressed && { opacity: activeOpacity.default },
            ]}
            onPress={submit}
            disabled={isLoading}
            accessibilityRole="button"
          >
            <ThemedText style={styles.primaryButtonText}>{primaryButtonLabel}</ThemedText>
          </Pressable>

          <View style={styles.footer}>
            <ThemedText style={[styles.footerText, { color: helperColor }]}>
              {t('auth.signupFooter')}{' '}
            </ThemedText>
            <Pressable
              onPress={() => {
                router.replace(hasCurrentAccount ? '/(auth)/password' : '/(auth)/signin');
              }}
              accessibilityRole="button"
              style={({ pressed }) => pressed && { opacity: activeOpacity.default }}
            >
              <ThemedText style={styles.footerLink}>{t('auth.signupFooterLink')}</ThemedText>
            </Pressable>
          </View>
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
    gap: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    width: '100%',
    maxWidth: 480,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: fontSize.sm,
  },
  footerLink: {
    color: semanticColors.systemBlue,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
