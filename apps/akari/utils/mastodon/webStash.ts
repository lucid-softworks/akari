/**
 * Stash + restore Mastodon OAuth state across the web auth-server redirect.
 *
 * Mirrors `utils/oauth/webStash.ts` for atproto: on web the browser does a
 * full-page navigation to the instance's authorize page, so the in-memory
 * state from `mastodonSignIn` is gone by the time we land back at
 * `/oauth/mastodon`. We park what the callback needs in `sessionStorage`
 * (cleared on tab close) for the round-trip, and wipe it right after the
 * token exchange. A separate key from the atproto stash keeps the two flows
 * from clobbering each other.
 */

const STASH_KEY = 'akari.mastodon.in-flight.v1';

export type StashedMastodonFlow = {
  state: string;
  instanceUrl: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  scope: string;
};

function isAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function stashMastodonFlow(value: StashedMastodonFlow): void {
  if (!isAvailable()) return;
  window.sessionStorage.setItem(STASH_KEY, JSON.stringify(value));
}

export function readMastodonFlow(): StashedMastodonFlow | null {
  if (!isAvailable()) return null;
  const raw = window.sessionStorage.getItem(STASH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StashedMastodonFlow;
  } catch {
    return null;
  }
}

export function clearMastodonFlow(): void {
  if (!isAvailable()) return;
  window.sessionStorage.removeItem(STASH_KEY);
}
