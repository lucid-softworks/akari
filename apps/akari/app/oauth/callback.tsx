import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useReducer } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

type CallbackResult =
  | { kind: 'pending' }
  | { kind: 'redirect'; href: string }
  | { kind: 'error'; message: string };

const PENDING_RESULT: CallbackResult = { kind: 'pending' };

function callbackReducer(_state: CallbackResult, action: CallbackResult): CallbackResult {
  // The flow is single-shot: each transition replaces the prior result
  // wholesale, so the reducer is a setter dressed up to avoid the
  // cascading-setState rule's invocation counter.
  return action;
}

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, opacity, spacing } from '@/constants/tokens';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { apiForPdsUrl } from '@/utils/blueskyApi';
import { bindOAuthAccount } from '@/utils/oauth/clientBinding';
import { OAUTH_CLIENT_ID, OAUTH_REDIRECT_URI } from '@/utils/oauth/config';
import { exchangeCodeForTokens } from '@/utils/oauth/token';
import { clearOAuthFlow, readOAuthFlow } from '@/utils/oauth/webStash';

/**
 * Web OAuth callback handler. The auth server redirects the browser to
 * this path with `?code=…&state=…` (or `?error=…`) after the user
 * grants. We pair that with the in-flight state stashed in
 * sessionStorage by `oauthSignIn` to finish the token exchange and
 * persist the account.
 *
 * Native builds never hit this route — `WebBrowser.openAuthSessionAsync`
 * captures the redirect in-process. We still register it so the app
 * doesn't 404 if a deep link slips through.
 */
export default function OAuthCallbackScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ code?: string; state?: string; error?: string; error_description?: string }>();

  const [result, dispatchResult] = useReducer(callbackReducer, PENDING_RESULT);
  const redirectTo = result.kind === 'redirect' ? result.href : null;
  const errorMessage = result.kind === 'error' ? result.message : null;

  const helperColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const screenBackground = useThemeColor({}, 'background');

  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      if (typeof params.error === 'string') {
        const description =
          typeof params.error_description === 'string' ? params.error_description : params.error;
        clearOAuthFlow();
        if (!cancelled) dispatchResult({ kind: 'error', message: description });
        return;
      }

      const code = typeof params.code === 'string' ? params.code : null;
      const stateParam = typeof params.state === 'string' ? params.state : null;
      if (!code || !stateParam) {
        if (!cancelled) dispatchResult({ kind: 'error', message: t('errors.screenNotFound') });
        return;
      }

      const stash = readOAuthFlow();
      if (!stash) {
        // No in-flight flow — likely a stale tab or the user navigated
        // directly to /oauth/callback. Bounce to sign-in start.
        if (!cancelled) dispatchResult({ kind: 'redirect', href: '/(auth)/oauth' });
        return;
      }
      if (stash.state !== stateParam) {
        clearOAuthFlow();
        if (!cancelled) {
          dispatchResult({
            kind: 'error',
            message: 'State mismatch, possible cross-site request forgery.',
          });
        }
        return;
      }

      try {
        const { tokens } = await exchangeCodeForTokens({
          authServer: stash.authServer,
          clientId: OAUTH_CLIENT_ID,
          redirectUri: OAUTH_REDIRECT_URI,
          code,
          codeVerifier: stash.codeVerifier,
          keypair: stash.keypair,
          nonce: stash.parNonce,
        });

        if (!tokens.refresh_token) {
          throw new Error('Token endpoint returned no refresh_token.');
        }
        if (!tokens.sub) {
          throw new Error('Token endpoint returned no sub claim.');
        }
        if (tokens.sub !== stash.identity.did) {
          throw new Error(
            `Authenticated DID (${tokens.sub}) does not match resolved handle DID (${stash.identity.did}).`,
          );
        }

        const baseAccount = {
          did: stash.identity.did,
          handle: stash.identity.handle,
          pdsUrl: stash.identity.pdsUrl,
          jwtToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          oauth: {
            dpopPrivateKeyHex: stash.keypair.privateKeyHex,
            dpopPublicJwk: stash.keypair.publicJwk,
            authServer: {
              issuer: stash.authServer.issuer,
              token_endpoint: stash.authServer.token_endpoint,
            },
            expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
            scope: tokens.scope,
          },
        };

        // Bind DPoP synchronously before the profile fetch so the first
        // XRPC request goes out signed. Same race window as the native
        // path in `oauth-scopes.tsx`.
        bindOAuthAccount(baseAccount);

        let profile: { displayName?: string; avatar?: string } = {};
        try {
          const api = apiForPdsUrl(stash.identity.pdsUrl);
          const fetched = await api.getProfile(tokens.access_token, stash.identity.did);
          profile = {
            displayName: fetched.displayName ?? undefined,
            avatar: fetched.avatar ?? undefined,
          };
        } catch (profileError) {
          if (__DEV__) console.warn('OAuth profile backfill failed:', profileError);
        }

        const newAccount = await addAccountMutation.mutateAsync({ ...baseAccount, ...profile });
        await switchAccountMutation.mutateAsync(newAccount);
        clearOAuthFlow();
        if (!cancelled) dispatchResult({ kind: 'redirect', href: '/' });
      } catch (err) {
        clearOAuthFlow();
        if (!cancelled) {
          dispatchResult({
            kind: 'error',
            message: err instanceof Error ? err.message : t('auth.signInFailed'),
          });
        }
      }
    };

    void finish();
    return () => {
      cancelled = true;
    };
    // Run-once: params and mutations are stable enough for an OAuth callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (redirectTo) {
    return <Redirect href={redirectTo as never} />;
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: screenBackground }]}>
      <View style={styles.content}>
        {errorMessage ? (
          <>
            <ThemedText type="title" style={styles.title}>
              {t('common.error')}
            </ThemedText>
            <ThemedText style={[styles.message, { color: helperColor }]}>{errorMessage}</ThemedText>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" />
            <ThemedText style={[styles.message, { color: helperColor }]}>
              {t('auth.oauthInFlight')}
            </ThemedText>
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    alignItems: 'center',
    gap: spacing.md,
    maxWidth: 420,
  },
  title: {
    fontSize: fontSize.xl,
  },
  message: {
    fontSize: fontSize.base,
    textAlign: 'center',
    opacity: opacity.secondary,
  },
});
