/**
 * Account-scoped reads for the Mastodon profile screen:
 *   - `GET /api/v1/accounts/:id` — full `Account` (with `followers_count`,
 *     `following_count`, `statuses_count`, `header`, `note`, `locked`).
 *   - `GET /api/v1/accounts/:id/statuses` — that account's authored
 *     statuses, `max_id`-paginated like the home timeline.
 *
 * Both accept anonymous reads but we send the token anyway so the server
 * applies the viewer's hide-flags + bookmark/favourite/reblog state on
 * each returned status.
 */

import type { MastodonAccount, MastodonStatus } from './types';

export type FetchAccountInput = {
  instanceUrl: string;
  accessToken: string;
  accountId: string;
};

export async function fetchMastodonAccount(
  input: FetchAccountInput,
): Promise<MastodonAccount> {
  const res = await fetch(
    `${input.instanceUrl}/api/v1/accounts/${encodeURIComponent(input.accountId)}`,
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: 'application/json',
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Mastodon account fetch failed (HTTP ${res.status}).`);
  }

  const json = (await res.json().catch(() => null)) as MastodonAccount | null;
  if (!json?.id) {
    throw new Error('Mastodon returned an unexpected account payload.');
  }
  return json;
}

export type LookupMastodonAccountInput = {
  instanceUrl: string;
  accessToken: string;
  /** `alice` for a local user, `alice@otherinstance.com` for federated.
   *  The viewer's instance resolves both forms to its local id. */
  acct: string;
};

/**
 * Resolve an `acct` (handle) to its full `Account` (which includes the
 * instance-local id). The profile screen uses this so URLs can be
 * keyed by handle rather than the opaque numeric id. The lookup also
 * returns the full account payload so the caller skips the extra
 * `/accounts/:id` round trip.
 *
 * 404 = the lookup found nothing on the viewer's instance, including
 * after a federated discovery attempt. Surface as an error rather than
 * an empty result so the screen renders a clear "couldn't load" state.
 */
export async function fetchMastodonAccountLookup(
  input: LookupMastodonAccountInput,
): Promise<MastodonAccount> {
  const url = new URL(`${input.instanceUrl}/api/v1/accounts/lookup`);
  url.searchParams.set('acct', input.acct);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Mastodon account lookup failed (HTTP ${res.status}).`);
  }

  const json = (await res.json().catch(() => null)) as MastodonAccount | null;
  if (!json?.id) {
    throw new Error('Mastodon returned an unexpected account-lookup payload.');
  }
  return json;
}

export type FetchAccountStatusesInput = {
  instanceUrl: string;
  accessToken: string;
  accountId: string;
  limit?: number;
  maxId?: string;
};

export type FetchAccountStatusesResult = {
  statuses: MastodonStatus[];
  /** `undefined` once the server returns fewer items than requested. */
  nextMaxId: string | undefined;
};

export async function fetchMastodonAccountStatuses(
  input: FetchAccountStatusesInput,
): Promise<FetchAccountStatusesResult> {
  const limit = input.limit ?? 20;
  const url = new URL(
    `${input.instanceUrl}/api/v1/accounts/${encodeURIComponent(input.accountId)}/statuses`,
  );
  url.searchParams.set('limit', String(limit));
  // `exclude_replies=false` is the default but we set it explicitly so the
  // contract is visible at the call site — replies show on the profile
  // feed, matching Mastodon's web client default.
  url.searchParams.set('exclude_replies', 'false');
  if (input.maxId) url.searchParams.set('max_id', input.maxId);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Mastodon account statuses failed (HTTP ${res.status}).`);
  }

  const json = (await res.json().catch(() => null)) as MastodonStatus[] | null;
  if (!Array.isArray(json)) {
    throw new Error('Mastodon returned a non-array account-statuses body.');
  }

  const last = json[json.length - 1];
  const nextMaxId = json.length < limit || !last ? undefined : last.id;
  return { statuses: json, nextMaxId };
}
