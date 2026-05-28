import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Input } from '@/components/ui/Input';

import { AddAccountForm } from '@/components/AddAccountForm';
import { Dialog } from '@/components/ui/Dialog';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  activeOpacity,
  fontSize,
  fontWeight,
  radius,
  semanticColors,
  spacing,
} from '@/constants/tokens';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useTypeaheadActors } from '@/hooks/queries/useTypeaheadActors';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useConfirm } from '@/hooks/useConfirm';
import { apiForPdsUrl } from '@/utils/blueskyApi';
import { bindOAuthAccount } from '@/utils/oauth/clientBinding';
import { oauthSignIn } from '@/utils/oauth/signIn';

type Step = 'pick' | 'oauth' | 'password';

const HANDLE_PATTERN = /^@?[a-zA-Z0-9._-]+$/;

type AddAccountModalProps = {
  onClose: () => void;
};

/**
 * Modal entry point for adding a new account. Both auth paths live
 * inside the modal:
 *
 *   - OAuth: collects the handle inline, then calls {@link oauthSignIn}.
 *     On web this triggers a full-page redirect to the PDS auth server
 *     (the modal disappears with the page), while native opens an
 *     in-app browser sheet and resolves back into the modal — so we
 *     persist the new account + switch to it before closing.
 *
 *   - App password: embeds {@link AddAccountForm} inline. The form
 *     handles its own signIn → addAccount → switchAccount chain and
 *     calls `onClose` once done.
 */
export function AddAccountModal({ onClose }: AddAccountModalProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const secondary = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const labelColor = useThemeColor({}, 'text');
  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#111827' }, 'background');
  const suggestionBg = useThemeColor({ light: '#ffffff', dark: '#15181c' }, 'background');
  const accent = semanticColors.systemBlue;

  const [step, setStep] = useState<Step>('pick');

  const goToOauth = () => setStep('oauth');

  return (
    <Dialog keyboardAvoiding onClose={onClose} maxWidth={560} height="80%">
      <View style={styles.contents}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          {step !== 'pick' ? (
            <Pressable
              onPress={() => setStep('pick')}
              style={({ pressed }) => [styles.backButton, pressed && { opacity: activeOpacity.default }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
            >
              <IconSymbol name="chevron.left" size={18} color={secondary} />
              <ThemedText style={[styles.backLabel, { color: secondary }]}>
                {t('common.back')}
              </ThemedText>
            </Pressable>
          ) : null}
          <ThemedText style={styles.title}>{t('common.addAccount')}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: secondary }]}>
            {step === 'password'
              ? t('auth.passwordChoiceSubtitle')
              : step === 'oauth'
              ? t('auth.oauthChoiceSubtitle')
              : t('auth.welcomeSubtitle')}
          </ThemedText>
        </View>

        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'pick' ? (
            <View style={styles.choices}>
              <Pressable
                style={({ pressed }) => [
                  styles.choicePrimary,
                  { backgroundColor: accent },
                  pressed && { opacity: activeOpacity.default },
                ]}
                onPress={goToOauth}
                accessibilityRole="button"
              >
                <View style={styles.choiceText}>
                  <ThemedText style={styles.choicePrimaryTitle}>
                    {t('auth.oauthChoiceTitle')}
                  </ThemedText>
                  <ThemedText style={styles.choicePrimarySubtitle}>
                    {t('auth.oauthChoiceSubtitle')}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={20} color="#ffffff" />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.choiceSecondary,
                  { borderColor },
                  pressed && { opacity: activeOpacity.default },
                ]}
                onPress={() => setStep('password')}
                accessibilityRole="button"
              >
                <View style={styles.choiceText}>
                  <ThemedText style={styles.choiceSecondaryTitle}>
                    {t('auth.passwordChoiceTitle')}
                  </ThemedText>
                  <ThemedText style={[styles.choiceSecondarySubtitle, { color: secondary }]}>
                    {t('auth.passwordChoiceSubtitle')}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={20} color={secondary} />
              </Pressable>
            </View>
          ) : step === 'oauth' ? (
            <OauthHandleForm
              onSuccess={onClose}
              borderColor={borderColor}
              accent={accent}
              secondary={secondary}
              labelColor={labelColor}
              inputBackground={inputBackground}
              suggestionBg={suggestionBg}
            />
          ) : (
            <AddAccountForm onSuccess={onClose} />
          )}
        </ScrollView>
      </View>
    </Dialog>
  );
}

/**
 * Inline OAuth handle entry. Mirrors the standalone `/(auth)/oauth`
 * screen's flow: handle input with typeahead suggestions, then a
 * Continue button that runs the full OAuth ceremony and (on platforms
 * where it resolves) persists + switches to the new account.
 *
 * The bulk of the heavy lifting is in {@link oauthSignIn}. On web that
 * function never resolves in this scope — it navigates the page to the
 * PDS authorization endpoint — so the post-redirect part of this code
 * only executes on native.
 */
function OauthHandleForm({
  onSuccess,
  borderColor,
  accent,
  secondary,
  labelColor,
  inputBackground,
  suggestionBg,
}: {
  onSuccess: () => void;
  borderColor: string;
  accent: string;
  secondary: string;
  labelColor: string;
  inputBackground: string;
  suggestionBg: string;
}) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [handle, setHandle] = useState('');
  const [inFlight, setInFlight] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();

  const trimmed = handle.replace(/^@/, '').trim();
  const canSubmit = trimmed.length > 0 && HANDLE_PATTERN.test(trimmed);
  const { data: suggestions } = useTypeaheadActors(handle);
  const showSuggestions = !suggestionsDismissed && suggestions.length > 0;

  // Auto-focus on mount so the user can start typing immediately after
  // picking OAuth from the modal's choice screen.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  const handleChange = useCallback((value: string) => {
    setHandle(value);
    setSuggestionsDismissed(false);
  }, []);

  const handleSelectSuggestion = useCallback((suggestedHandle: string) => {
    setHandle(suggestedHandle);
    setSuggestionsDismissed(true);
    inputRef.current?.blur();
  }, []);

  const handleContinue = useCallback(async () => {
    if (!canSubmit || inFlight) return;
    inputRef.current?.blur();
    setInFlight(true);
    try {
      const result = await oauthSignIn(trimmed);

      // Persist the new account so DPoP signing has somewhere to read
      // its keypair from, then switch to it. Mirrors the dedicated
      // OAuth screen's post-success block (`app/(auth)/oauth.tsx`).
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
      bindOAuthAccount(baseAccount);

      let profile: { displayName?: string; avatar?: string } = {};
      try {
        const api = apiForPdsUrl(result.pdsUrl);
        const fetched = await api.getProfile(result.accessJwt, result.did);
        profile = {
          displayName: fetched.displayName ?? undefined,
          avatar: fetched.avatar ?? undefined,
        };
      } catch (profileError) {
        if (__DEV__) console.warn('OAuth profile backfill failed:', profileError);
      }

      const newAccount = await addAccountMutation.mutateAsync({ ...baseAccount, ...profile });
      await switchAccountMutation.mutateAsync(newAccount);
      onSuccess();
    } catch (error) {
      confirm({
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('auth.signInFailed'),
        buttons: [{ text: t('common.ok') }],
      });
    } finally {
      setInFlight(false);
    }
  }, [addAccountMutation, canSubmit, confirm, inFlight, onSuccess, switchAccountMutation, t, trimmed]);

  return (
    <View style={styles.oauthForm}>
      <ThemedText style={[styles.fieldLabel, { color: labelColor }]}>
        {t('auth.blueskyHandle')}
      </ThemedText>
      <Input
        ref={inputRef}
        size="lg"
        containerStyle={styles.inputBox}
        value={handle}
        onChangeText={handleChange}
        placeholder={t('auth.blueskyHandlePlaceholder')}
        placeholderTextColor={secondary}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        onSubmitEditing={handleContinue}
        returnKeyType="go"
      />
      {showSuggestions ? (
        <View style={[styles.suggestionList, { borderColor, backgroundColor: suggestionBg }]}>
          {suggestions.slice(0, 6).map((actor) => (
            <Pressable
              key={actor.did}
              onPress={() => handleSelectSuggestion(actor.handle)}
              style={({ pressed }) => [
                styles.suggestionRow,
                { borderBottomColor: borderColor },
                pressed && { opacity: activeOpacity.default },
              ]}
            >
              <View style={styles.suggestionBody}>
                <ThemedText style={styles.suggestionName} numberOfLines={1}>
                  {actor.displayName ?? actor.handle}
                </ThemedText>
                <ThemedText style={[styles.suggestionHandle, { color: secondary }]} numberOfLines={1}>
                  @{actor.handle}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      <ThemedText style={[styles.helperText, { color: secondary }]}>
        {t('auth.handleHelperText')}
      </ThemedText>
      <Pressable
        onPress={handleContinue}
        disabled={!canSubmit || inFlight}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.continueButton,
          { backgroundColor: accent },
          (!canSubmit || inFlight) && { opacity: 0.5 },
          pressed && { opacity: activeOpacity.default },
        ]}
      >
        <ThemedText style={styles.continueLabel}>
          {inFlight ? t('auth.signingIn') : t('auth.continue')}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contents: { flex: 1 },
  header: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: spacing.xs,
  },
  backLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  subtitle: {
    fontSize: fontSize.sm,
  },
  bodyScroll: { flex: 1 },
  body: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  choices: {
    gap: spacing.md,
  },
  choicePrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  choiceSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  choiceText: {
    flex: 1,
    gap: 4,
  },
  choicePrimaryTitle: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  choicePrimarySubtitle: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    opacity: 0.85,
  },
  choiceSecondaryTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  choiceSecondarySubtitle: {
    fontSize: fontSize.sm,
  },
  oauthForm: {
    gap: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  inputBox: {
    borderRadius: radius.md,
  },
  suggestionList: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  suggestionBody: {
    gap: 2,
  },
  suggestionName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  suggestionHandle: {
    fontSize: fontSize.sm,
  },
  helperText: {
    fontSize: fontSize.sm,
  },
  continueButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  continueLabel: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
