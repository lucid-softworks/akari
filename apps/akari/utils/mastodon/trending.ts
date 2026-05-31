/**
 * Trending statuses for the current Mastodon instance.
 *
 * `GET /api/v1/trends/statuses` (Mastodon 3.5+). Available without auth
 * but we send the token anyway so the instance applies the viewer's
 * hide-flags. Returns `Status[]`, paginated by offset (NOT `max_id` like
 * the home timeline — the trending list isn't ordered by id, so offset
 * is the only sensible window).
 *
 * 404 → empty list. Some forks (older Pleroma, GoToSocial in default
 * config) don't ship the endpoint; treat that as "no trending here"
 * rather than an error so the screen renders an empty state instead of
 * a banner.
 */

import type { MastodonStatus } from './types';

export type FetchTrendingInput = {
  instanceUrl: string;
  accessToken: string;
  /** Mastodon caps at 40 per request; default matches the home timeline. */
  limit?: number;
  /** Position to start from for pagination. First page = 0. */
  offset?: number;
};

export type FetchTrendingResult = {
  statuses: MastodonStatus[];
  /** `undefined` when the page returned fewer items than requested (end). */
  nextOffset: number | undefined;
};

export async function fetchMastodonTrending(
  input: FetchTrendingInput,
): Promise<FetchTrendingResult> {
  const limit = input.limit ?? 20;
  const offset = input.offset ?? 0;
  const url = new URL(`${input.instanceUrl}/api/v1/trends/statuses`);
  url.searchParams.set('limit', String(limit));
  if (offset > 0) url.searchParams.set('offset', String(offset));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 404) return { statuses: [], nextOffset: undefined };
    throw new Error(`Mastodon trending failed (HTTP ${res.status}).`);
  }

  const body = (await res.json().catch(() => null)) as MastodonStatus[] | null;
  if (!Array.isArray(body)) return { statuses: [], nextOffset: undefined };

  // Short page → end of feed. Same heuristic as the home timeline:
  // avoids a wasted trailing empty fetch.
  const nextOffset = body.length < limit ? undefined : offset + body.length;
  return { statuses: body, nextOffset };
}
