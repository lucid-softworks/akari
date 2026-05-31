import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { Account } from '@/types/account';
import { generateCodeVerifier } from '@/utils/oauth/pkce';

import { buildMastodonAccount } from './account';
import { registerOrLoadApp } from './app';
import { mastodonRedirectUri, MASTODON_SCOPE } from './config';
import { normalizeInstanceUrl, verifyInstance } from './discovery';
import { exchangeMastodonCode, verifyMastodonCredentials } from './token';
import { stashMastodonFlow } from './webStash';

export type MastodonSignInResult = {
  account: Account;
};

function buildAuthorizeUrl(
  instanceUrl: string,
  clientId: string,
  redirectUri: string,
  scope: string,
  state: string,
): string {
  const url = new URL(`${instanceUrl}/oauth/authorize`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  return url.toString();
}

/**
 * Run the full authorization-code OAuth flow against a Mastodon / fediverse
 * instance.
 *
 *  1. Normalise the typed domain and confirm it's a fediverse server.
 *  2. Register (or reuse a cached) OAuth client for the instance.
 *  3. Open the authorize URL — native captures the redirect in-process;
 *     web stashes flow state and full-page-navigates (the callback route
 *     `app/oauth/mastodon.tsx` finishes the exchange).
 *  4. Validate `state`, exchange `code` for a Bearer token, read the
 *     profile via `verify_credentials`, and assemble an Account.
 *
 * Throws on any non-success outcome. On web the returned promise never
 * resolves (the page is navigating away) — the caller's `await` simply hangs
 * until navigation completes, matching the atproto web flow.
 */
export async function mastodonSignIn(instanceInput: string): Promise<MastodonSignInResult> {
  const instanceUrl = normalizeInstanceUrl(instanceInput);
  await verifyInstance(instanceUrl);

  const redirectUri = mastodonRedirectUri();
  const app = await registerOrLoadApp(instanceUrl, redirectUri, MASTODON_SCOPE);
  const state = generateCodeVerifier(); // 64 bytes of entropy is plenty for `state`.

  const authorizeUrl = buildAuthorizeUrl(
    instanceUrl,
    app.clientId,
    redirectUri,
    MASTODON_SCOPE,
    state,
  );

  if (Platform.OS === 'web') {
    stashMastodonFlow({
      state,
      instanceUrl,
      redirectUri,
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      scope: MASTODON_SCOPE,
    });
    if (typeof window !== 'undefined') {
      window.location.assign(authorizeUrl);
    }
    // The page is leaving — never resolve.
    return new Promise<MastodonSignInResult>(() => {});
  }

  const browserResult = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectUri);
  if (browserResult.type !== 'success' || !browserResult.url) {
    throw new Error(`Mastodon sign-in cancelled or failed: ${browserResult.type}`);
  }

  const callback = new URL(browserResult.url);
  const callbackError = callback.searchParams.get('error');
  if (callbackError) {
    const description = callback.searchParams.get('error_description') ?? callbackError;
    throw new Error(`Authorization rejected: ${description}`);
  }

  const callbackState = callback.searchParams.get('state');
  if (callbackState !== state) {
    throw new Error('Authorization state mismatch — possible cross-site request forgery.');
  }
  const code = callback.searchParams.get('code');
  if (!code) {
    throw new Error('Authorization callback missing `code` parameter.');
  }

  const token = await exchangeMastodonCode({
    instanceUrl,
    clientId: app.clientId,
    clientSecret: app.clientSecret,
    redirectUri,
    code,
    scope: MASTODON_SCOPE,
  });
  const credentials = await verifyMastodonCredentials(instanceUrl, token.access_token);

  return {
    account: buildMastodonAccount({ instanceUrl, app, token, credentials }),
  };
}
