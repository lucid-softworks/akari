/**
 * Mastodon follow / unfollow. Returns the resulting `Relationship` so the
 * caller can reconcile UI from the post-action truth (e.g. locked accounts
 * respond with `requested: true` rather than `following: true`).
 */

import type { MastodonRelationship } from './types';

export type FollowMastodonInput = {
  instanceUrl: string;
  accessToken: string;
  /** Instance-local account id (not the handle/URL). */
  accountId: string;
};

async function callRelationshipEndpoint(
  input: FollowMastodonInput,
  action: 'follow' | 'unfollow',
): Promise<MastodonRelationship> {
  const res = await fetch(
    `${input.instanceUrl}/api/v1/accounts/${encodeURIComponent(input.accountId)}/${action}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: 'application/json',
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Mastodon ${action} failed (HTTP ${res.status}).`);
  }

  const json = (await res.json().catch(() => null)) as MastodonRelationship | null;
  if (!json || typeof json.following !== 'boolean') {
    throw new Error(`Mastodon ${action} returned an unexpected response.`);
  }
  return json;
}

export function followMastodonAccount(input: FollowMastodonInput): Promise<MastodonRelationship> {
  return callRelationshipEndpoint(input, 'follow');
}

export function unfollowMastodonAccount(input: FollowMastodonInput): Promise<MastodonRelationship> {
  return callRelationshipEndpoint(input, 'unfollow');
}
