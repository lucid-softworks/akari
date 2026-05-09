/**
 * Stash + restore OAuth state across the web auth-server redirect. On
 * web the browser navigates the entire page to the auth server, so the
 * in-memory state from `oauthSignIn` is gone by the time we land back
 * at `/oauth/callback`. We park it in `sessionStorage` (cleared on tab
 * close) for the duration of the round-trip.
 *
 * The DPoP private key sits here too. That's acceptable on a same-tab
 * redirect: the key is single-use for this OAuth flow, and the stash
 * is wiped immediately after token exchange.
 */

import type { AuthorizationServerMetadata, ResolvedIdentity } from './discovery';
import type { DpopKeypair } from './dpop';

const STASH_KEY = 'akari.oauth.in-flight.v1';

export type StashedOAuthFlow = {
  state: string;
  codeVerifier: string;
  parNonce?: string;
  scope: string;
  identity: ResolvedIdentity;
  authServer: AuthorizationServerMetadata;
  keypair: DpopKeypair;
};

function isAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function stashOAuthFlow(value: StashedOAuthFlow): void {
  if (!isAvailable()) return;
  window.sessionStorage.setItem(STASH_KEY, JSON.stringify(value));
}

export function readOAuthFlow(): StashedOAuthFlow | null {
  if (!isAvailable()) return null;
  const raw = window.sessionStorage.getItem(STASH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StashedOAuthFlow;
  } catch {
    return null;
  }
}

export function clearOAuthFlow(): void {
  if (!isAvailable()) return;
  window.sessionStorage.removeItem(STASH_KEY);
}
