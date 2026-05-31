import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useReducer } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { fontSize, opacity, spacing } from '@/constants/tokens';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { buildMastodonAccount } from '@/utils/mastodon/account';
import { exchangeMastodonCode, verifyMastodonCredentials } from '@/utils/mastodon/token';
import { clearMastodonFlow, readMastodonFlow } from '@/utils/mastodon/webStash';

type CallbackResult =
  | { kind: 'pending' }
  | { kind: 'redirect'; href: string }
  | { kind: 'error'; message: string };

const PENDING_RESULT: CallbackResult = { kind: 'pending' };

function callbackReducer(_state: CallbackResult, action: CallbackResult): CallbackResult {
  // Single-shot flow: each transition replaces the prior result wholesale.
  return action;
}

/**
 * Web Mastodon OAuth callback handler. The instance redirects the browser
 * here with `?code=…&state=…` (or `?error=…`) after the user grants. We pair
 * that with the in-flight flow stashed in sessionStorage by `mastodonSignIn`
 * to finish the token exchange and persist the account.
 *
 * Native builds never hit this route — `WebBrowser.openAuthSessionAsync`
 * captures the redirect in-process. We still register it so a stray deep
 * link doesn't 404.
 */
export default function MastodonCallbackScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }>();

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
        clearMastodonFlow();
        if (!cancelled) dispatchResult({ kind: 'error', message: description });
        return;
      }

      const code = typeof params.code === 'string' ? params.code : null;
      const stateParam = typeof params.state === 'string' ? params.state : null;
      if (!code || !stateParam) {
        if (!cancelled) dispatchResult({ kind: 'error', message: t('errors.screenNotFound') });
        return;
      }

      const stash = readMastodonFlow();
      if (!stash) {
        // No in-flight flow — stale tab or a direct navigation. Bounce to start.
        if (!cancelled) dispatchResult({ kind: 'redirect', href: '/(auth)/mastodon' });
        return;
      }
      if (stash.state !== stateParam) {
        clearMastodonFlow();
        if (!cancelled) {
          dispatchResult({
            kind: 'error',
            message: 'State mismatch, possible cross-site request forgery.',
          });
        }
        return;
      }

      try {
        const token = await exchangeMastodonCode({
          instanceUrl: stash.instanceUrl,
          clientId: stash.clientId,
          clientSecret: stash.clientSecret,
          redirectUri: stash.redirectUri,
          code,
          scope: stash.scope,
        });
        const credentials = await verifyMastodonCredentials(stash.instanceUrl, token.access_token);

        const account = buildMastodonAccount({
          instanceUrl: stash.instanceUrl,
          app: {
            instanceUrl: stash.instanceUrl,
            redirectUri: stash.redirectUri,
            scope: stash.scope,
            clientId: stash.clientId,
            clientSecret: stash.clientSecret,
          },
          token,
          credentials,
        });

        const newAccount = await addAccountMutation.mutateAsync(account);
        await switchAccountMutation.mutateAsync(newAccount);
        clearMastodonFlow();
        if (!cancelled) dispatchResult({ kind: 'redirect', href: '/' });
      } catch (err) {
        clearMastodonFlow();
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
