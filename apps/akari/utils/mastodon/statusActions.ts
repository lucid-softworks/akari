/**
 * Per-status actions on Mastodon: favourite / reblog / bookmark + their
 * undo counterparts. Each endpoint returns the updated `Status` so the
 * caller drives UI from the post-action truth (counts + flags both flip
 * server-side; we don't predict the count adjustment, the response is the
 * source of truth).
 */

import type { MastodonStatus } from './types';

export type MastodonStatusActionKind = 'favourite' | 'reblog' | 'bookmark';

const ENDPOINT: Record<MastodonStatusActionKind, { on: string; off: string }> = {
  favourite: { on: 'favourite', off: 'unfavourite' },
  reblog: { on: 'reblog', off: 'unreblog' },
  bookmark: { on: 'bookmark', off: 'unbookmark' },
};

export type MastodonStatusActionInput = {
  instanceUrl: string;
  accessToken: string;
  statusId: string;
  action: MastodonStatusActionKind;
  /** `true` to perform the action (favourite/reblog/bookmark),
   *  `false` to undo it. */
  value: boolean;
};

export async function mastodonStatusAction(
  input: MastodonStatusActionInput,
): Promise<MastodonStatus> {
  const path = input.value ? ENDPOINT[input.action].on : ENDPOINT[input.action].off;
  const res = await fetch(
    `${input.instanceUrl}/api/v1/statuses/${encodeURIComponent(input.statusId)}/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: 'application/json',
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Mastodon ${path} failed (HTTP ${res.status}).`);
  }

  const json = (await res.json().catch(() => null)) as MastodonStatus | null;
  if (!json?.id) {
    throw new Error(`Mastodon ${path} returned an unexpected response.`);
  }
  return json;
}
