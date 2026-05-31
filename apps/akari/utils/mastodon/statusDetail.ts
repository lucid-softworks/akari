/**
 * Single-status reads: the status itself + its `context` (ancestors and
 * descendants) for the in-app status detail screen.
 *
 * Both endpoints accept anonymous reads but we send the token anyway so
 * the server applies the viewer's hide-flags + bookmark/favourite/reblog
 * state (`bookmarked`, `favourited`, `reblogged` are viewer-scoped and
 * elided from anonymous responses).
 */

import type { MastodonStatus } from './types';

export type FetchStatusInput = {
  instanceUrl: string;
  accessToken: string;
  statusId: string;
};

export async function fetchMastodonStatus(input: FetchStatusInput): Promise<MastodonStatus> {
  const res = await fetch(
    `${input.instanceUrl}/api/v1/statuses/${encodeURIComponent(input.statusId)}`,
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: 'application/json',
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Mastodon status fetch failed (HTTP ${res.status}).`);
  }

  const json = (await res.json().catch(() => null)) as MastodonStatus | null;
  if (!json?.id) {
    throw new Error('Mastodon returned an unexpected status payload.');
  }
  return json;
}

export type MastodonStatusContext = {
  /** Statuses above this one in the thread (root → parent → ... → focused). */
  ancestors: MastodonStatus[];
  /** Statuses below the focused status (replies, replies-of-replies). */
  descendants: MastodonStatus[];
};

export async function fetchMastodonStatusContext(
  input: FetchStatusInput,
): Promise<MastodonStatusContext> {
  const res = await fetch(
    `${input.instanceUrl}/api/v1/statuses/${encodeURIComponent(input.statusId)}/context`,
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: 'application/json',
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Mastodon status context fetch failed (HTTP ${res.status}).`);
  }

  const json = (await res.json().catch(() => null)) as MastodonStatusContext | null;
  if (!json || !Array.isArray(json.ancestors) || !Array.isArray(json.descendants)) {
    throw new Error('Mastodon returned an unexpected status context payload.');
  }
  return json;
}
