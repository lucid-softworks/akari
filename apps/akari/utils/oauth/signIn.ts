import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { OAUTH_CLIENT_ID, OAUTH_REDIRECT_URI, OAUTH_SCOPE } from './config';
import { type DpopKeypair, generateDpopKeypair } from './dpop';
import {
  type AuthorizationServerMetadata,
  resolveIdentity,
  getAuthorizationServer,
} from './discovery';
import { pushAuthorizationRequest } from './par';
import { codeChallengeFromVerifier, generateCodeVerifier } from './pkce';
import { exchangeCodeForTokens } from './token';
import { stashOAuthFlow } from './webStash';

export type OAuthSignInResult = {
  did: string;
  handle: string;
  pdsUrl: string;
  accessJwt: string;
  refreshJwt: string;
  scope: string;
  /** Unix-seconds expiry of `accessJwt`. */
  expiresAt: number;
  authServer: AuthorizationServerMetadata;
  keypair: DpopKeypair;
  /** Most-recent DPoP nonce — feed into the first authenticated request. */
  nonce?: string;
};

/**
 * Run the full authorization-code OAuth flow for an atproto identity.
 *
 *  1. Resolve `handle` → `did` → `pdsUrl` → `authServer` metadata.
 *  2. Generate a fresh DPoP keypair, PKCE verifier+challenge, and `state`.
 *  3. PAR — push the authorization request to the auth server, receive
 *     a single-use `request_uri`.
 *  4. Open the authorize URL in the system browser via
 *     `WebBrowser.openAuthSessionAsync`. The redirect URI is registered
 *     as a custom URL scheme on the app, so the OS hands the callback
 *     URL back to us when the user grants.
 *  5. Validate the returned `state`, exchange `code` for tokens.
 *
 * Throws on any non-success outcome (user cancelled the browser, network
 * error, server rejection, etc.). Caller is responsible for persisting the
 * returned tokens and keypair.
 */
export async function oauthSignIn(
  handle: string,
  /** Space-separated scope string. Defaults to the maximum scope set
   *  declared in the hosted client metadata. The picker passes the
   *  subset the user ticked. */
  scope: string = OAUTH_SCOPE,
): Promise<OAuthSignInResult> {
  const identity = await resolveIdentity(handle);
  const authServer = await getAuthorizationServer(identity.pdsUrl);

  const keypair = generateDpopKeypair();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = codeChallengeFromVerifier(codeVerifier);
  const state = generateCodeVerifier(); // 64 bytes is more than enough entropy for `state` too.

  const { requestUri, nonce: parNonce } = await pushAuthorizationRequest({
    authServer,
    clientId: OAUTH_CLIENT_ID,
    redirectUri: OAUTH_REDIRECT_URI,
    scope,
    state,
    codeChallenge,
    loginHint: handle,
    keypair,
  });

  const authorizeUrl = new URL(authServer.authorization_endpoint);
  authorizeUrl.searchParams.set('client_id', OAUTH_CLIENT_ID);
  authorizeUrl.searchParams.set('request_uri', requestUri);

  // Web flow: there's no in-app browser session that can hand a result
  // back to us — the redirect is a full-page navigation. Stash
  // everything the callback route needs, then send the user to the auth
  // server. `app/oauth/callback.tsx` picks up the redirect, exchanges
  // the code for tokens, and finishes account setup.
  if (Platform.OS === 'web') {
    stashOAuthFlow({
      state,
      codeVerifier,
      parNonce,
      scope,
      identity,
      authServer,
      keypair,
    });
    if (typeof window !== 'undefined') {
      window.location.assign(authorizeUrl.toString());
    }
    // The page is leaving — never resolve. The caller's `await`
    // simply hangs until navigation completes, which is fine.
    return new Promise<OAuthSignInResult>(() => {});
  }

  const browserResult = await WebBrowser.openAuthSessionAsync(
    authorizeUrl.toString(),
    OAUTH_REDIRECT_URI,
  );

  if (browserResult.type !== 'success' || !browserResult.url) {
    throw new Error(`OAuth flow cancelled or failed: ${browserResult.type}`);
  }

  const callback = new URL(browserResult.url);
  // The authorize endpoint may surface an OAuth error on the redirect URI.
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

  const { tokens, nonce: tokenNonce } = await exchangeCodeForTokens({
    authServer,
    clientId: OAUTH_CLIENT_ID,
    redirectUri: OAUTH_REDIRECT_URI,
    code,
    codeVerifier,
    keypair,
    nonce: parNonce,
  });

  if (!tokens.refresh_token) {
    throw new Error('Token endpoint returned no refresh_token; cannot persist session.');
  }
  if (!tokens.sub) {
    throw new Error('Token endpoint returned no sub claim; cannot bind to identity.');
  }
  if (tokens.sub !== identity.did) {
    throw new Error(
      `Authenticated DID (${tokens.sub}) does not match resolved handle DID (${identity.did}).`,
    );
  }

  return {
    did: identity.did,
    handle: identity.handle,
    pdsUrl: identity.pdsUrl,
    accessJwt: tokens.access_token,
    refreshJwt: tokens.refresh_token,
    scope: tokens.scope,
    expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
    authServer,
    keypair,
    nonce: tokenNonce,
  };
}
