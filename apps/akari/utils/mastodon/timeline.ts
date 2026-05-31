/**
 * Mastodon home-timeline fetch. Native Status entity, no shape conversion:
 * the rendering side switches on the account's provider and feeds a Mastodon
 * card the native shape, rather than reshaping into a Bluesky type that
 * doesn't actually fit (boosts ≠ reposts, CW is a real field not a label,
 * custom emoji aren't atproto facets, etc.).
 *
 * Pagination uses Mastodon's `max_id` cursor — pass the last status id on
 * the page as `max_id` to get the next slice. We deliberately ignore the
 * Link header pagination format here: `max_id` works identically on every
 * fediverse server we target (Mastodon, Pleroma, Akkoma, GoToSocial) and
 * needs no header parsing across `fetch` implementations.
 */

import type { MastodonStatus } from './types';

export type FetchHomeTimelineInput = {
  instanceUrl: string;
  accessToken: string;
  /** Max items per page. Mastodon caps at 40; default matches `useHomeFeed`'s 20. */
  limit?: number;
  /** Status id to paginate before — pass the oldest id from the previous page. */
  maxId?: string;
};

export type FetchHomeTimelineResult = {
  statuses: MastodonStatus[];
  /** `undefined` when the server returns fewer items than requested (end of feed). */
  nextMaxId: string | undefined;
};

export async function fetchMastodonHomeTimeline(
  input: FetchHomeTimelineInput,
): Promise<FetchHomeTimelineResult> {
  const limit = input.limit ?? 20;
  const url = new URL(`${input.instanceUrl}/api/v1/timelines/home`);
  url.searchParams.set('limit', String(limit));
  if (input.maxId) url.searchParams.set('max_id', input.maxId);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Mastodon home timeline failed (HTTP ${res.status}).`);
  }

  const json = (await res.json().catch(() => null)) as MastodonStatus[] | null;
  if (!Array.isArray(json)) {
    throw new Error('Mastodon home timeline returned a non-array body.');
  }

  // Short page → there's nothing after it. Avoids a wasted trailing fetch
  // that would return `[]` and then have to be detected client-side.
  const last = json[json.length - 1];
  const nextMaxId = json.length < limit || !last ? undefined : last.id;

  return { statuses: json, nextMaxId };
}
