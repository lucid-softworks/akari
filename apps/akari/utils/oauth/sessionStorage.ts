import { MMKV } from 'react-native-mmkv';

import type { DpopPublicJwk } from './dpop';

const SESSIONS_KEY = 'sessions';

/**
 * Persisted record of an atproto OAuth session. Held separately from the
 * existing app-password `Account` store so phase-1 OAuth login doesn't risk
 * corrupting Bearer-authed accounts that the rest of the app currently
 * depends on.
 *
 * Phase 2 will wire these into `BlueskyApiClient` (DPoP-signed Authorization
 * + auto-refresh + nonce handoff). Until then this storage is the canonical
 * proof-of-life that the OAuth flow ran end-to-end.
 */
export type OAuthSession = {
  did: string;
  handle: string;
  pdsUrl: string;
  /** DPoP-bound access JWT. Sent as `Authorization: DPoP <accessJwt>`. */
  accessJwt: string;
  /** Single-use refresh token. Server rotates this on each refresh. */
  refreshJwt: string;
  /** Space-delimited scope string the server actually granted. */
  scope: string;
  /** Unix-seconds expiry of `accessJwt`. */
  expiresAt: number;
  /** P-256 private scalar in lowercase hex. Long-lived, account-bound. */
  dpopPrivateKeyHex: string;
  /** Public half of the DPoP keypair, embedded into every proof's header. */
  dpopPublicJwk: DpopPublicJwk;
  /** Authorization server endpoints, cached so refresh doesn't re-discover. */
  authServer: {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    pushed_authorization_request_endpoint: string;
  };
  /** Most recently observed `DPoP-Nonce` from the auth server. */
  nonce?: string;
  /** Unix-seconds when the session was first created. */
  createdAt: number;
};

const storage = new MMKV({ id: 'oauth-sessions' });

function readAll(): OAuthSession[] {
  try {
    const raw = storage.getString(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OAuthSession[]) : [];
  } catch {
    return [];
  }
}

function writeAll(sessions: OAuthSession[]): void {
  storage.set(SESSIONS_KEY, JSON.stringify(sessions));
}

/**
 * Save `session`, replacing any existing entry for the same DID. Returns
 * the full updated list so callers can re-render without a separate load.
 */
export function upsertOAuthSession(session: OAuthSession): OAuthSession[] {
  const existing = readAll();
  const next = [...existing.filter((s) => s.did !== session.did), session];
  writeAll(next);
  return next;
}

export function listOAuthSessions(): OAuthSession[] {
  return readAll();
}

export function getOAuthSession(did: string): OAuthSession | undefined {
  return readAll().find((s) => s.did === did);
}

export function removeOAuthSession(did: string): OAuthSession[] {
  const next = readAll().filter((s) => s.did !== did);
  writeAll(next);
  return next;
}
