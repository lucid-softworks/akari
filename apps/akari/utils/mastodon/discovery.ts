/**
 * Mastodon / fediverse instance discovery.
 *
 * Far lighter than atproto's handle → DID → PDS → auth-server chain: an
 * account is identified by the server domain the user types, so all we do is
 * normalise that domain and confirm something fediverse-shaped answers there
 * before we send the user off to a browser consent screen.
 */

export type MastodonInstanceInfo = {
  /** Canonical origin, e.g. `https://mastodon.social`. */
  url: string;
  /** Human-readable title from the instance metadata, when advertised. */
  title?: string;
};

/**
 * Coerce whatever the user typed into an `https://host` origin.
 *
 * Accepts `mastodon.social`, `https://mastodon.social/`, a stray leading `@`,
 * and full `user@instance.tld` addresses (we keep the instance part). Throws
 * on empty/obviously-invalid input so the caller can surface a clear message
 * before any network round-trip.
 */
export function normalizeInstanceUrl(input: string): string {
  let value = input.trim().replace(/^@/, '');

  // `user@instance.tld` → `instance.tld`. A bare `instance.tld` has no `@`,
  // so this only strips a real local-part.
  if (value.includes('@')) {
    value = value.split('@').pop() ?? '';
  }

  value = value
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .trim()
    .toLowerCase();

  // A server domain needs at least one dot and no path/space characters.
  if (!value || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) {
    throw new Error('Enter a valid server domain, for example mastodon.social');
  }

  return `https://${value}`;
}

/**
 * Confirm the domain hosts a fediverse server by reading its public instance
 * metadata. `/api/v1/instance` is supported by Mastodon, Pleroma, Akkoma and
 * GoToSocial alike, so it doubles as a cheap "is this the fediverse?" check.
 * Throws a friendly error when the domain doesn't answer.
 */
export async function verifyInstance(instanceUrl: string): Promise<MastodonInstanceInfo> {
  let res: Response;
  try {
    res = await fetch(`${instanceUrl}/api/v1/instance`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(`Could not reach ${instanceUrl}. Check the server domain and try again.`);
  }

  if (!res.ok) {
    throw new Error(`${instanceUrl} does not look like a fediverse server (HTTP ${res.status}).`);
  }

  const json = (await res.json().catch(() => null)) as { uri?: string; title?: string } | null;
  return { url: instanceUrl, title: json?.title };
}
