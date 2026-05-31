/**
 * Fetch follow suggestions for the signed-in Mastodon account.
 *
 * Mastodon shipped two endpoints over time:
 *   - `GET /api/v2/suggestions` (modern). Returns
 *       `[{ source: string, account }]` on Mastodon ≤ 4.2, and
 *       `[{ sources: string[], account }]` on Mastodon ≥ 4.3.
 *   - `GET /api/v1/suggestions` (legacy). Returns a bare `Account[]`.
 *
 * We try v2 first, fall back to v1 on 404 (some forks — GoToSocial, older
 * Pleroma — only ship v1). Both shapes are normalised into a flat
 * `MastodonSuggestion[]` so the screen doesn't have to branch.
 *
 * The server filters already-followed accounts itself, so the list is
 * always "new people the user could follow."
 */

import type { MastodonAccount, MastodonSuggestion } from './types';

export type FetchMastodonSuggestionsInput = {
  instanceUrl: string;
  accessToken: string;
  /** Max items to return. Mastodon caps at 80; we ask for 20 by default. */
  limit?: number;
};

type V2Item = { account?: MastodonAccount } | null;

function isAccount(value: unknown): value is MastodonAccount {
  return Boolean(value && typeof value === 'object' && 'id' in (value as object) && 'username' in (value as object));
}

function normalizeV2(items: V2Item[]): MastodonSuggestion[] {
  return items.flatMap((item) => (isAccount(item?.account) ? [{ account: item!.account! }] : []));
}

function normalizeV1(items: unknown[]): MastodonSuggestion[] {
  // v1 returns a bare Account[]; older builds wrap it in `{ account, … }` —
  // accept both so we don't have to special-case minor server variants.
  return items.flatMap((item) => {
    if (isAccount(item)) return [{ account: item }];
    if (item && typeof item === 'object' && 'account' in item && isAccount((item as { account?: unknown }).account)) {
      return [{ account: (item as { account: MastodonAccount }).account }];
    }
    return [];
  });
}

export async function fetchMastodonSuggestions(
  input: FetchMastodonSuggestionsInput,
): Promise<MastodonSuggestion[]> {
  const limit = input.limit ?? 20;
  const headers = {
    Authorization: `Bearer ${input.accessToken}`,
    Accept: 'application/json',
  };

  const v2 = await fetch(`${input.instanceUrl}/api/v2/suggestions?limit=${limit}`, { headers });
  if (v2.ok) {
    const body = (await v2.json().catch(() => null)) as V2Item[] | null;
    if (Array.isArray(body)) return normalizeV2(body);
  } else if (v2.status !== 404) {
    throw new Error(`Mastodon suggestions failed (HTTP ${v2.status}).`);
  }

  const v1 = await fetch(`${input.instanceUrl}/api/v1/suggestions?limit=${limit}`, { headers });
  if (!v1.ok) {
    // Some forks (notably GoToSocial in certain configurations) return 404
    // for both — treat that as "this server doesn't surface suggestions"
    // and let the screen render its empty state.
    if (v1.status === 404) return [];
    throw new Error(`Mastodon suggestions failed (HTTP ${v1.status}).`);
  }

  const body = (await v1.json().catch(() => null)) as unknown[] | null;
  if (!Array.isArray(body)) return [];
  return normalizeV1(body);
}
