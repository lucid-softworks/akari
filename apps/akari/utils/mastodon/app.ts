import { storage } from '@/utils/secureStorage';

import { MASTODON_CLIENT_NAME, MASTODON_CLIENT_WEBSITE } from './config';

/**
 * A dynamically-registered OAuth client for a single fediverse instance.
 * Mastodon mints the id/secret on `POST /api/v1/apps`; both are required on
 * every token exchange and refresh, so we persist them.
 */
export type MastodonAppCredentials = {
  /** Instance origin this client is registered with. */
  instanceUrl: string;
  /** Redirect URI registered with the instance (must match at exchange). */
  redirectUri: string;
  /** Scope the app was registered for (must cover what we request). */
  scope: string;
  clientId: string;
  clientSecret: string;
};

function loadCachedApp(instanceUrl: string): MastodonAppCredentials | null {
  const all = storage.getItem('mastodonApps') ?? {};
  return all[instanceUrl] ?? null;
}

function cacheApp(creds: MastodonAppCredentials): void {
  const all = storage.getItem('mastodonApps') ?? {};
  all[creds.instanceUrl] = creds;
  storage.setItem('mastodonApps', all);
}

/**
 * Return a registered OAuth client for `instanceUrl`, registering one if we
 * don't already have a cached client whose `redirectUri` and `scope` still
 * match. The redirect URI differs between web origins (dev localhost vs.
 * prod) and the scope can change as the app grows, so a cache entry is only
 * reusable when both line up — otherwise the instance would reject the
 * authorize request.
 *
 * Throws on a non-2xx registration response or a malformed body.
 */
export async function registerOrLoadApp(
  instanceUrl: string,
  redirectUri: string,
  scope: string,
): Promise<MastodonAppCredentials> {
  const cached = loadCachedApp(instanceUrl);
  if (cached && cached.redirectUri === redirectUri && cached.scope === scope) {
    return cached;
  }

  const res = await fetch(`${instanceUrl}/api/v1/apps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_name: MASTODON_CLIENT_NAME,
      redirect_uris: redirectUri,
      scopes: scope,
      website: MASTODON_CLIENT_WEBSITE,
    }),
  });

  if (!res.ok) {
    throw new Error(`Registering with ${instanceUrl} failed (HTTP ${res.status}).`);
  }

  const json = (await res.json().catch(() => null)) as
    | { client_id?: string; client_secret?: string }
    | null;
  if (!json?.client_id || !json.client_secret) {
    throw new Error(`${instanceUrl} returned an incomplete app registration.`);
  }

  const creds: MastodonAppCredentials = {
    instanceUrl,
    redirectUri,
    scope,
    clientId: json.client_id,
    clientSecret: json.client_secret,
  };
  cacheApp(creds);
  return creds;
}
