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
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { Menu, MenuTrigger, type MenuItem } from '@/components/ui/Menu';
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
  const suffixes = isCustom ? [] : SIGNUP_PROVIDERS[provider].handleSuffixes;
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

  const handleSuffixSlot = hasSuffixChoice ? (
    <Menu items={suffixItems}>
      <MenuTrigger
        style={({ pressed }) => [
          styles.suffixTrigger,
          pressed && { opacity: activeOpacity.default },
        ]}
      >
        <ThemedText style={[styles.suffixLabel, { color: helperColor }]}>
          {handleSuffix}
        </ThemedText>
        <IconSymbol name="chevron.down" size={12} color={helperColor} />
      </MenuTrigger>
    </Menu>
  ) : (
    <ThemedText style={[styles.suffixLabel, { color: helperColor }]}>
      {handleSuffix}
    </ThemedText>
  );

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

          <View style={styles.fields}>
            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: labelColor }]}>
                {t('auth.signupServer')}
              </ThemedText>
              <Menu items={providerItems}>
                <MenuTrigger
                  style={({ pressed }) => [
                    styles.dropdownTrigger,
                    { borderColor, backgroundColor: inputBackground },
                    pressed && { opacity: activeOpacity.default },
                  ]}
                >
                  <ThemedText style={[styles.dropdownTriggerLabel, { color: labelColor }]}>
                    {providerDisplayLabel}
                  </ThemedText>
                  <IconSymbol name="chevron.down" size={14} color={helperColor} />
                </MenuTrigger>
              </Menu>
            </View>

            {isCustom ? (
              <View style={styles.field}>
                <ThemedText style={[styles.label, { color: labelColor }]}>
                  {t('auth.signupCustomPdsUrl')}
                </ThemedText>
                <Input
                  ref={customPdsUrlInputRef}
                  value={customPdsUrl}
                  onChangeText={setCustomPdsUrl}
                  placeholder={t('auth.signupCustomPdsUrlPlaceholder')}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <ThemedText style={[styles.helper, { color: helperColor }]}>
                  {t('auth.signupCustomPdsUrlHelper')}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: labelColor }]}>
                {t('auth.signupEmail')}
              </ThemedText>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.signupEmailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: labelColor }]}>
                {t('auth.signupPassword')}
              </ThemedText>
              <Input
                ref={passwordInputRef}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.signupPasswordPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => handleInputRef.current?.focus()}
              />
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: labelColor }]}>
                {t('auth.signupHandle')}
              </ThemedText>
              {isCustom ? (
                <Input
                  ref={handleInputRef}
                  value={handle}
                  onChangeText={setHandle}
                  placeholder={t('auth.signupCustomHandlePlaceholder')}
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  returnKeyType={showInviteCode ? 'next' : 'go'}
                  onSubmitEditing={() => {
                    if (showInviteCode) inviteInputRef.current?.focus();
                    else submit();
                  }}
                />
              ) : (
                <Input
                  ref={handleInputRef}
                  value={handle}
                  onChangeText={setHandle}
                  placeholder={t('auth.signupHandlePlaceholder')}
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  returnKeyType={showInviteCode ? 'next' : 'go'}
                  onSubmitEditing={() => {
                    if (showInviteCode) inviteInputRef.current?.focus();
                    else submit();
                  }}
                  suffix={handleSuffixSlot}
                />
              )}
              <ThemedText style={[styles.helper, { color: helperColor }]}>
                {isCustom ? t('auth.signupCustomHandleHelper') : t('auth.signupHandleHelper')}
              </ThemedText>
            </View>

            {showInviteCode ? (
              <View style={styles.field}>
                <ThemedText style={[styles.label, { color: labelColor }]}>
                  {t('auth.signupInviteCode')}
                </ThemedText>
                <Input
                  ref={inviteInputRef}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  placeholder={t('auth.signupInviteCodePlaceholder')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={submit}
                />
              </View>
            ) : (
              <Pressable
                onPress={() => setShowInviteCode(true)}
                accessibilityRole="button"
                style={({ pressed }) => pressed && { opacity: activeOpacity.default }}
              >
                <ThemedText style={styles.inlineLink}>{t('auth.signupInviteCodeToggle')}</ThemedText>
              </Pressable>
            )}
          </View>

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
  fields: { gap: spacing.lg },
  field: { gap: spacing.xs },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownTriggerLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  suffixTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: spacing.xs,
    paddingVertical: spacing.xs,
  },
  suffixLabel: {
    fontSize: fontSize.base,
  },
  helper: {
    fontSize: fontSize.sm,
  },
  inlineLink: {
    color: semanticColors.systemBlue,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
