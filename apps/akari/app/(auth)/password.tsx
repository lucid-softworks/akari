import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPdsUrlFromHandle } from '@/bluesky-api';
import { spacing, radius, fontSize, fontWeight, opacity, semanticColors, layout, hitSlop } from '@/constants/tokens';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSignIn } from '@/hooks/mutations/useSignIn';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useTypeaheadActors } from '@/hooks/queries/useTypeaheadActors';
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
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | null>(null);

  const signInMutation = useSignIn();
  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();
  const handleInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const trimmedHandle = handle.replace(/^@/, '').trim();
  const [showAppPasswordHelp, setShowAppPasswordHelp] = useState(false);
  // Closes the typeahead dropdown after the user picks a suggestion. Selecting
  // a result fills the handle field with the full handle, which would otherwise
  // re-trigger the query and immediately re-show the same list.
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const { data: typeaheadResults } = useTypeaheadActors(handle);
  const showSuggestions = typeaheadResults.length > 0 && !suggestionsDismissed;

  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const labelColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const suggestionBackground = useThemeColor({ light: '#ffffff', dark: '#15181c' }, 'background');
  const infoBorderColor = useThemeColor({ light: '#e1e5e9', dark: '#1F212D' }, 'border');
  const screenBackground = useThemeColor({}, 'background');

  const handleSelectSuggestion = useCallback((suggestedHandle: string) => {
    setHandle(suggestedHandle);
    setSuggestionsDismissed(true);
    // Focus the password field next so the user can finish entering credentials
    // without an extra tap after picking from the dropdown.
    passwordInputRef.current?.focus();
  }, []);

  const handleHandleChange = useCallback((value: string) => {
    setHandle(value);
    setSuggestionsDismissed(false);
  }, []);

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

      setRedirectAfterAuth(currentAccount ? '/(tabs)/settings' : '/');
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

      setRedirectAfterAuth('/');
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

  const sheetBackgroundColor = useThemeColor({ light: '#ffffff', dark: '#1c1f24' }, 'background');
  const insets = useSafeAreaInsets();

  if (redirectAfterAuth) {
    return <Redirect href={redirectAfterAuth as never} />;
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: screenBackground }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
            <View style={styles.passwordHeader}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.passwordLogo}
                contentFit="contain"
              />
              <ThemedText type="title" style={styles.passwordTitle}>
                {t('auth.passwordScreenTitle')}
              </ThemedText>
              <ThemedText style={[styles.passwordSubtitle, { color: helperColor }]}>
                {t('auth.passwordScreenSubtitle')}
              </ThemedText>
            </View>
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <ThemedText style={[styles.label, { color: labelColor }]}>{t('auth.blueskyHandle')}</ThemedText>
                <View style={styles.inputAnchor}>
                  <TextInput
                    ref={handleInputRef}
                    style={[styles.input, { borderColor, backgroundColor: inputBackground, color: labelColor }]}
                    value={handle}
                    onChangeText={handleHandleChange}
                    placeholder={t('auth.blueskyHandlePlaceholder')}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                  />

                  {showSuggestions ? (
                    <ThemedView style={[styles.suggestions, { backgroundColor: suggestionBackground, borderColor }]}>
                      <ScrollView
                        style={styles.suggestionsScroll}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                      >
                        {typeaheadResults.map((actor, index) => {
                          const isLast = index === typeaheadResults.length - 1;
                          return (
                            <TouchableOpacity
                              key={actor.did}
                              onPress={() => handleSelectSuggestion(actor.handle)}
                              activeOpacity={0.7}
                              style={[
                                styles.suggestion,
                                !isLast && { borderBottomColor: borderColor, borderBottomWidth: layout.hairline },
                              ]}
                            >
                              {actor.avatar ? (
                                <Image source={{ uri: actor.avatar }} style={styles.suggestionAvatar} contentFit="cover" />
                              ) : (
                                <View style={[styles.suggestionAvatar, styles.suggestionAvatarPlaceholder, { borderColor }]} />
                              )}
                              <View style={styles.suggestionText}>
                                {actor.displayName ? (
                                  <ThemedText style={styles.suggestionName} numberOfLines={1}>
                                    {actor.displayName}
                                  </ThemedText>
                                ) : null}
                                <ThemedText
                                  style={[styles.suggestionHandle, { color: helperColor }]}
                                  numberOfLines={1}
                                >
                                  @{actor.handle}
                                </ThemedText>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </ThemedView>
                  ) : null}
                </View>
                <ThemedText style={[styles.helperText, { color: helperColor }]}>
                  {t('auth.handleHelperText')}
                </ThemedText>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <ThemedText style={[styles.label, { color: labelColor }]}>{t('auth.appPassword')}</ThemedText>
                  <TouchableOpacity
                    onPress={() => setShowAppPasswordHelp(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('auth.howToGetAppPassword')}
                    hitSlop={hitSlop}
                  >
                    <IconSymbol name="questionmark.circle" size={18} color={helperColor} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.input, { borderColor, backgroundColor: inputBackground, color: labelColor }]}
                  value={appPassword}
                  onChangeText={setAppPassword}
                  onFocus={() => setSuggestionsDismissed(true)}
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
              onPress={handleSignIn}
              disabled={isLoading}
            >
              <ThemedText style={styles.primaryButtonText}>{primaryButtonLabel}</ThemedText>
            </TouchableOpacity>

        </View>
      </ScrollView>

      <Modal
        visible={showAppPasswordHelp}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAppPasswordHelp(false)}
      >
        <Pressable style={styles.helpBackdrop} onPress={() => setShowAppPasswordHelp(false)}>
          <Pressable
            style={[styles.helpSheetWrapper, { paddingBottom: insets.bottom + spacing.md }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedView
              style={[styles.helpSheet, { backgroundColor: sheetBackgroundColor, borderColor: infoBorderColor }]}
            >
              <View style={styles.helpSheetHeader}>
                <ThemedText style={styles.helpSheetTitle}>{t('auth.howToGetAppPassword')}</ThemedText>
                <TouchableOpacity
                  onPress={() => setShowAppPasswordHelp(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.done')}
                  hitSlop={hitSlop}
                >
                  <IconSymbol name="xmark" size={20} color={helperColor} />
                </TouchableOpacity>
              </View>
              <ThemedText style={[styles.helpSheetBody, { color: helperColor }]}>
                {t('auth.appPasswordInstructions')}
              </ThemedText>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
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
  passwordHeader: {
    alignItems: 'center',
    gap: spacing.md,
  },
  passwordLogo: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
  },
  passwordTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  passwordSubtitle: {
    fontSize: fontSize.base,
    lineHeight: 22,
    textAlign: 'center',
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  helpSheetWrapper: {
    paddingHorizontal: spacing.lg,
  },
  helpSheet: {
    borderRadius: radius.lg,
    borderWidth: layout.hairline,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        maxWidth: 420,
        alignSelf: 'center',
        width: '100%',
      },
      default: {},
    }),
  },
  helpSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpSheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  helpSheetBody: {
    fontSize: fontSize.base,
    lineHeight: 22,
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
  inputAnchor: {
    // Anchors the absolutely-positioned suggestions list below the input so
    // the dropdown overlays the helper text and password field instead of
    // pushing the layout around as the user types.
    position: 'relative',
  },
  suggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    borderWidth: layout.hairline,
    borderRadius: radius.sm,
    overflow: 'hidden',
    maxHeight: 220,
    zIndex: 100,
    elevation: 8,
  },
  suggestionsScroll: {
    flexGrow: 0,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  suggestionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  suggestionAvatarPlaceholder: {
    borderWidth: layout.hairline,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  suggestionHandle: {
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: layout.hairline,
  },
  dividerText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: layout.border,
    alignItems: 'center',
  },
  secondaryButtonText: {
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
});
