import { Image } from '@/components/Image';
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { spacing, radius, fontSize, fontWeight, layout, opacity, semanticColors, shadows } from '@/constants/tokens';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useTypeaheadActors } from '@/hooks/queries/useTypeaheadActors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';
import { bindOAuthAccount } from '@/utils/oauth/clientBinding';
import { oauthSignIn } from '@/utils/oauth/signIn';
import { apiForPdsUrl } from '@/utils/blueskyApi';

const HANDLE_PATTERN = /^@?[a-zA-Z0-9._-]+$/;

export default function OauthSignInScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ handle?: string }>();
  const initialHandle = typeof params.handle === 'string' ? params.handle : '';

  const [handle, setHandle] = useState(initialHandle);
  const [signInInFlight, setSignInInFlight] = useState(false);
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | null>(null);
  // Closes the typeahead dropdown after the user picks a suggestion. Selecting
  // a result fills the handle field with the full handle, which would otherwise
  // re-trigger the query and immediately re-show the same list.
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();

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

  // Render the typeahead dropdown as a sibling of ScrollView — see
  // password.tsx for the same pattern + rationale (incl. the per-platform
  // coordinate math: web uses position:fixed against the viewport, native
  // uses position:absolute inside the container so we subtract the
  // container's window offset).
  const inputAnchorRef = useRef<View>(null);
  // KeyboardAvoidingView doesn't expose measureInWindow, so wrap its
  // children in a plain View we can ref + measure.
  const containerRef = useRef<View>(null);
  const [anchorRect, setAnchorRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const measureAnchor = useCallback(() => {
    if (!inputAnchorRef.current) return;
    inputAnchorRef.current.measureInWindow((inputX, inputY, width, height) => {
      if (Platform.OS === 'web' || !containerRef.current) {
        setAnchorRect({ x: inputX, y: inputY, width, height });
        return;
      }
      containerRef.current.measureInWindow((containerX, containerY) => {
        setAnchorRect({
          x: inputX - containerX,
          y: inputY - containerY,
          width,
          height,
        });
      });
    });
  }, []);

  useEffect(() => {
    if (showSuggestions) measureAnchor();
  }, [showSuggestions, measureAnchor, typeaheadResults.length]);

  const handleContinue = useCallback(async () => {
    if (!canSubmit || signInInFlight) return;
    setSignInInFlight(true);
    try {
      const result = await oauthSignIn(trimmed);

      const baseAccount = {
        did: result.did,
        handle: result.handle,
        pdsUrl: result.pdsUrl,
        jwtToken: result.accessJwt,
        refreshToken: result.refreshJwt,
        oauth: {
          dpopPrivateKeyHex: result.keypair.privateKeyHex,
          dpopPublicJwk: result.keypair.publicJwk,
          authServer: {
            issuer: result.authServer.issuer,
            token_endpoint: result.authServer.token_endpoint,
          },
          authServerNonce: result.nonce,
          expiresAt: result.expiresAt,
          scope: result.scope,
        },
      };

      // Bind the DPoP signer synchronously, before any XRPC call: the
      // profile fetch below + the home tab's first request race the
      // OAuthAccountBinder's `useEffect` and would otherwise hit the
      // PDS as plain Bearer.
      bindOAuthAccount(baseAccount);

      // Backfill displayName + avatar so the navbar / account switcher
      // render the user's identity. Failure is non-fatal — the account
      // record is still valid without it.
      let profile: { displayName?: string; avatar?: string } = {};
      try {
        const api = apiForPdsUrl(result.pdsUrl);
        const fetched = await api.getProfile(result.accessJwt, result.did);
        profile = {
          displayName: fetched.displayName ?? undefined,
          avatar: fetched.avatar ?? undefined,
        };
      } catch (profileError) {
        if (__DEV__) {
          console.warn('OAuth profile backfill failed:', profileError);
        }
      }

      const newAccount = await addAccountMutation.mutateAsync({ ...baseAccount, ...profile });

      await switchAccountMutation.mutateAsync(newAccount);

      setRedirectAfterAuth('/');
    } catch (error) {
      showAlert({
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('auth.signInFailed'),
      });
    } finally {
      setSignInInFlight(false);
    }
  }, [addAccountMutation, canSubmit, signInInFlight, switchAccountMutation, t, trimmed]);

  if (redirectAfterAuth) {
    return <Redirect href={redirectAfterAuth as never} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: screenBackground }]}
    >
      <View ref={containerRef} style={styles.container}>
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
            <View ref={inputAnchorRef} style={styles.inputAnchor} onLayout={measureAnchor}>
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

      {/*
        Typeahead dropdown rendered as a sibling of the ScrollView with
        `pointerEvents="box-none"` on the overlay so the input keeps focus
        while typing. See password.tsx for the full rationale; same pattern
        applied here for parity.
      */}
      {showSuggestions && anchorRect ? (
        <View
          pointerEvents="auto"
          style={{
            // `position: fixed` on web pins the dropdown to the viewport,
            // matching `measureInWindow`'s reference frame exactly. See
            // password.tsx for the full rationale.
            position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as 'absolute',
            top: anchorRect.y + anchorRect.height + spacing.xs,
            left: anchorRect.x,
            width: anchorRect.width,
            maxHeight: 220,
            borderWidth: layout.hairline,
            borderRadius: radius.sm,
            overflow: 'hidden',
            backgroundColor: suggestionBackground,
            borderColor,
            ...shadows.md,
          }}
        >
            <ScrollView
              style={styles.suggestionsScroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {typeaheadResults.map((actor, index) => {
                const isLast = index === typeaheadResults.length - 1;
                return (
                  <Pressable
                    key={actor.did}
                    onPress={() => handleSelectSuggestion(actor.handle)}
                    
                    style={({ pressed }) => [styles.suggestion,
                      !isLast && { borderBottomColor: borderColor, borderBottomWidth: layout.hairline }, pressed && { opacity: 0.7 }]}
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
                  </Pressable>
                );
              })}
          </ScrollView>
        </View>
      ) : null}
      </View>
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
    //
    // The transform + zIndex combo is what actually wins on web: zIndex
    // alone is unreliable because RN-Web's atomic CSS hashes the property
    // value into a class name that HMR can leave stale rules for. A
    // no-op `translateY: 0` forces the browser to create a fresh stacking
    // context here. Native just respects the child zIndex.
    position: 'relative',
    zIndex: 9999,
    transform: [{ translateY: 0 }],
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
    zIndex: 9999,
    // Without an elevation/shadow the panel ends up white-on-white in light
    // mode (page bg and suggestionBackground are both `#fff`) and almost
    // matches in dark mode too — looks like the dropdown has no background
    // at all. `shadows.md` is the dropdown/popover token: a subtle drop
    // shadow that translates to box-shadow on web and proper RN shadow* +
    // elevation on native.
    ...shadows.md,
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
