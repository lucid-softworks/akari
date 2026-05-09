import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, layout, opacity, radius, semanticColors, spacing } from '@/constants/tokens';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { showAlert } from '@/utils/alert';
import { apiForPdsUrl } from '@/utils/blueskyApi';
import { bindOAuthAccount } from '@/utils/oauth/clientBinding';
import {
  OAUTH_FLAT_SCOPES,
  OAUTH_REPO_SCOPES,
  buildSelectedScopeString,
  defaultScopeSelection,
  type RepoAction,
  type ScopeSelection,
} from '@/utils/oauth/config';
import { oauthSignIn } from '@/utils/oauth/signIn';

/**
 * Scope picker — full page rather than a modal so the long list of
 * per-collection CRUD toggles has room to scroll naturally and so the
 * back button does the obvious thing on every platform.
 *
 * The previous screen (`oauth.tsx`) collected the handle and pushed
 * here; we own the actual sign-in call so all post-auth state lives in
 * one place.
 */
export default function OauthScopesScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ handle?: string }>();
  const handle = typeof params.handle === 'string' ? params.handle.replace(/^@/, '').trim() : '';

  const [scopeSelection, setScopeSelection] = useState<ScopeSelection>(defaultScopeSelection);
  const [signInInFlight, setSignInInFlight] = useState(false);
  const [redirectAfterAuth, setRedirectAfterAuth] = useState<string | null>(null);

  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();

  const labelColor = useThemeColor({ light: '#374151', dark: '#E2E8F0' }, 'text');
  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#1F212D' }, 'border');
  const screenBackground = useThemeColor({}, 'background');

  const handleToggleFlatScope = useCallback((scopeId: string) => {
    const scope = OAUTH_FLAT_SCOPES.find((s) => s.id === scopeId);
    if (!scope || scope.required) return;
    setScopeSelection((prev) => ({
      ...prev,
      flat: { ...prev.flat, [scopeId]: !prev.flat[scopeId] },
    }));
  }, []);

  const handleToggleRepoAction = useCallback((collection: string, action: RepoAction) => {
    const scope = OAUTH_REPO_SCOPES.find((s) => s.collection === collection);
    if (!scope) return;
    if ((scope.requiredActions ?? []).includes(action)) return;
    setScopeSelection((prev) => {
      const current = prev.repo[collection] ?? {};
      return {
        ...prev,
        repo: {
          ...prev.repo,
          [collection]: { ...current, [action]: !current[action] },
        },
      };
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (signInInFlight) return;
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/oauth');
  }, [signInInFlight]);

  const handleConfirm = useCallback(async () => {
    if (!handle || signInInFlight) return;
    const scopeString = buildSelectedScopeString(scopeSelection);
    setSignInInFlight(true);
    try {
      const result = await oauthSignIn(handle, scopeString);

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

      // Bind the DPoP signer synchronously, before any XRPC call. See
      // oauth.tsx for the full rationale; same race window here.
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
      setRedirectAfterAuth('/');
    } catch (error) {
      showAlert({
        title: t('common.error'),
        message: error instanceof Error ? error.message : t('auth.signInFailed'),
      });
    } finally {
      setSignInInFlight(false);
    }
  }, [addAccountMutation, handle, scopeSelection, signInInFlight, switchAccountMutation, t]);

  if (redirectAfterAuth) {
    return <Redirect href={redirectAfterAuth as never} />;
  }

  if (!handle) {
    // Hit this screen without a handle — bounce back to the entry form.
    return <Redirect href={'/(auth)/oauth' as never} />;
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: screenBackground }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <ThemedText type="title" style={[styles.title, { color: labelColor }]}>
          {t('oauth.scopes.title', { handle })}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: helperColor }]}>
          {t('oauth.scopes.subtitle')}
        </ThemedText>

        {OAUTH_FLAT_SCOPES.map((scope) => {
          const checked = scope.required || !!scopeSelection.flat[scope.id];
          return (
            <Pressable
              key={scope.id}
              onPress={() => handleToggleFlatScope(scope.id)}
              disabled={scope.required}
              style={({ pressed }) => [
                styles.flatRow,
                { borderColor },
                pressed && !scope.required ? { opacity: 0.7 } : null,
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: scope.required }}
            >
              {scope.required ? (
                <View style={[styles.lockIcon, { borderColor }]}>
                  <IconSymbol name="lock.fill" size={12} color={helperColor} />
                </View>
              ) : (
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: checked ? semanticColors.systemBlue : borderColor,
                      backgroundColor: checked ? semanticColors.systemBlue : 'transparent',
                    },
                  ]}
                >
                  {checked ? <IconSymbol name="checkmark" size={14} color="#ffffff" /> : null}
                </View>
              )}
              <View style={styles.rowText}>
                <ThemedText style={[styles.rowLabel, { color: labelColor }]}>
                  {t(scope.labelKey as never)}
                  {scope.required ? (
                    <ThemedText style={[styles.required, { color: helperColor }]}>
                      {` · ${t('oauth.scopes.required')}`}
                    </ThemedText>
                  ) : null}
                </ThemedText>
                <ThemedText style={[styles.rowDescription, { color: helperColor }]}>
                  {t(scope.descriptionKey as never)}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}

        {OAUTH_REPO_SCOPES.map((scope) => {
          const requiredActions = scope.requiredActions ?? [];
          const actionState = scopeSelection.repo[scope.collection] ?? {};
          return (
            <View key={scope.collection} style={[styles.repoRow, { borderColor }]}>
              <ThemedText style={[styles.rowLabel, { color: labelColor }]}>
                {t(scope.labelKey as never)}
              </ThemedText>
              <ThemedText style={[styles.rowDescription, { color: helperColor }]}>
                {t(scope.descriptionKey as never)}
              </ThemedText>
              <ThemedText style={[styles.collection, { color: helperColor }]}>
                {scope.collection}
              </ThemedText>
              <View style={styles.actionsRow}>
                {scope.actions.map((action) => {
                  const required = requiredActions.includes(action);
                  const enabled = required || !!actionState[action];
                  if (required) {
                    // Required actions are always granted. Render as a flat
                    // info chip with a lock — no toggle, no check.
                    return (
                      <View
                        key={action}
                        style={[
                          styles.actionLocked,
                          { borderColor },
                        ]}
                        accessibilityRole="text"
                      >
                        <IconSymbol name="lock.fill" size={11} color={helperColor} />
                        <ThemedText
                          style={[styles.actionLockedText, { color: helperColor }]}
                        >
                          {t(`oauth.scopes.action.${action}` as never)}
                        </ThemedText>
                      </View>
                    );
                  }
                  return (
                    <Pressable
                      key={action}
                      onPress={() => handleToggleRepoAction(scope.collection, action)}
                      style={({ pressed }) => [
                        styles.actionPill,
                        {
                          borderColor: enabled ? semanticColors.systemBlue : borderColor,
                          backgroundColor: enabled ? semanticColors.systemBlue : 'transparent',
                        },
                        pressed ? { opacity: 0.7 } : null,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: enabled }}
                    >
                      <ThemedText
                        style={[
                          styles.actionPillText,
                          { color: enabled ? '#ffffff' : labelColor },
                        ]}
                      >
                        {t(`oauth.scopes.action.${action}` as never)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

      </ScrollView>

      <View style={[styles.footer, { borderTopColor: borderColor, backgroundColor: screenBackground }]}>
        <Pressable
          onPress={handleCancel}
          disabled={signInInFlight}
          style={({ pressed }) => [
            styles.secondaryButton,
            { borderColor },
            (pressed || signInInFlight) && { opacity: opacity.disabled },
          ]}
        >
          <ThemedText style={[styles.secondaryButtonText, { color: labelColor }]}>
            {t('common.cancel')}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={handleConfirm}
          disabled={signInInFlight}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || signInInFlight) && { opacity: opacity.disabled },
          ]}
        >
          <ThemedText style={styles.primaryButtonText}>
            {signInInFlight ? t('auth.oauthInFlight') : t('oauth.scopes.continue')}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    ...(Platform.OS === 'web' ? { maxWidth: 640, width: '100%', alignSelf: 'center' } : null),
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  subtitle: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  flatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: layout.hairline,
    borderRadius: radius.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: layout.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  // Stand-in for the checkbox on required rows — same footprint so the
  // text column doesn't shift, but a lock icon instead of a check so the
  // user understands the row is always granted.
  lockIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: layout.hairline,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  required: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  rowDescription: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  repoRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  collection: {
    fontFamily: 'SpaceMono',
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  actionPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: layout.border,
  },
  actionPillText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
  actionLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: layout.hairline,
    borderStyle: 'dashed',
  },
  actionLockedText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  footnote: {
    fontSize: fontSize.xs,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: layout.hairline,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  secondaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: layout.hairline,
  },
  secondaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  primaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: semanticColors.systemBlue,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
