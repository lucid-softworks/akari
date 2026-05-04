import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { spacing, radius, fontSize, fontWeight, layout, opacity, semanticColors } from '@/constants/tokens';
import { useTypeaheadActors } from '@/hooks/queries/useTypeaheadActors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';
import { upsertOAuthSession } from '@/utils/oauth/sessionStorage';
import { oauthSignIn } from '@/utils/oauth/signIn';

const HANDLE_PATTERN = /^@?[a-zA-Z0-9._-]+$/;

export default function OauthSignInScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ handle?: string }>();
  const initialHandle = typeof params.handle === 'string' ? params.handle : '';

  const [handle, setHandle] = useState(initialHandle);
  const [signInInFlight, setSignInInFlight] = useState(false);
  // Closes the typeahead dropdown after the user picks a suggestion. Selecting
  // a result fills the handle field with the full handle, which would otherwise
  // re-trigger the query and immediately re-show the same list.
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const trimmed = handle.replace(/^@/, '').trim();
  const canSubmit = trimmed.length > 0 && HANDLE_PATTERN.test(trimmed);
  const { data: typeaheadResults } = useTypeaheadActors(handle);
  const showSuggestions = typeaheadResults.length > 0 && !suggestionsDismissed;

  const labelColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const suggestionBackground = useThemeColor({ light: '#ffffff', dark: '#15181c' }, 'background');
  // Match the picker screen's themed background — KeyboardAvoidingView is
  // transparent by default and would otherwise show whatever's behind it
  // depending on the navigator's surface color.
  const screenBackground = useThemeColor({}, 'background');

  // Auto-focus the input on mount; users come here specifically to type a handle.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const handleSelectSuggestion = useCallback((suggestedHandle: string) => {
    setHandle(suggestedHandle);
    setSuggestionsDismissed(true);
    inputRef.current?.blur();
  }, []);

  const handleHandleChange = useCallback((value: string) => {
    setHandle(value);
    setSuggestionsDismissed(false);
  }, []);

  const handleContinue = useCallback(async () => {
    if (!canSubmit || signInInFlight) return;
    setSignInInFlight(true);
    try {
      const result = await oauthSignIn(trimmed);
      upsertOAuthSession({
        did: result.did,
        handle: result.handle,
        pdsUrl: result.pdsUrl,
        accessJwt: result.accessJwt,
        refreshJwt: result.refreshJwt,
        scope: result.scope,
        expiresAt: result.expiresAt,
        dpopPrivateKeyHex: result.keypair.privateKeyHex,
        dpopPublicJwk: result.keypair.publicJwk,
        authServer: {
          issuer: result.authServer.issuer,
          authorization_endpoint: result.authServer.authorization_endpoint,
          token_endpoint: result.authServer.token_endpoint,
          pushed_authorization_request_endpoint:
            result.authServer.pushed_authorization_request_endpoint,
        },
        nonce: result.nonce,
        createdAt: Math.floor(Date.now() / 1000),
      });
      showAlert({
        title: t('auth.oauthSuccessTitle'),
        message: t('auth.oauthSuccessMessage', { handle: result.handle, did: result.did }),
        buttons: [
          {
            text: t('common.done'),
            onPress: () => router.back(),
          },
        ],
      });
    } catch (error) {
      showAlert({
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('auth.signInFailed'),
      });
    } finally {
      setSignInInFlight(false);
    }
  }, [canSubmit, signInInFlight, trimmed, t]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: screenBackground }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <ThemedText type="title" style={styles.title}>
              {t('auth.oauthScreenTitle')}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: helperColor }]}>
              {t('auth.oauthScreenSubtitle')}
            </ThemedText>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText style={[styles.label, { color: labelColor }]}>{t('auth.blueskyHandle')}</ThemedText>
            <View style={styles.inputAnchor}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { borderColor, backgroundColor: inputBackground, color: labelColor }]}
                value={handle}
                onChangeText={handleHandleChange}
                placeholder={t('auth.blueskyHandlePlaceholder')}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                returnKeyType="go"
                onSubmitEditing={handleContinue}
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
          </View>

          <Pressable
            style={[
              styles.primaryButton,
              (!canSubmit || signInInFlight) ? styles.buttonDisabled : null,
            ]}
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
  inputAnchor: {
    // Anchors the absolutely-positioned suggestions list below the input,
    // so adding suggestions doesn't push the Continue button around. The
    // dropdown overlays whatever sits beneath it (which is fine — the user
    // is interacting with the suggestion list, not the button).
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
    // Cap so big result sets don't grow off-screen; the rest scroll inside.
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
  buttonDisabled: {
    opacity: opacity.disabled,
  },
});
