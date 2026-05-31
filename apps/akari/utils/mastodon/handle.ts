/**
 * Mastodon handle helpers — keep the URL-shape logic in one place so the
 * post card, profile screen, future mentions and notifications all build
 * the same federated form when navigating.
 */

import type { MastodonAccount } from './types';

/**
 * Extract the host (`mastodon.social`) from an instance URL
 * (`https://mastodon.social` or `https://mastodon.social/`).
 */
export function instanceHostFromUrl(instanceUrl: string | undefined): string | undefined {
  if (!instanceUrl) return undefined;
  return instanceUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

/**
 * Build the full federated form of an account's handle, suitable for
 * use as a URL path segment.
 *
 * Mastodon's `acct` field is already `user@otherinstance` for federated
 * (remote) users but just `user` for local users on the viewer's
 * instance. Profile URLs need the full form for shareability — a URL
 * like `/profile/alice` would resolve to a different person on every
 * instance otherwise. We append the viewer's host for local accounts.
 *
 * Returns `undefined` if we can't derive it (no acct + no viewer host),
 * so callers can render a disabled affordance rather than a broken link.
 */
export function toFullAcct(
  account: Pick<MastodonAccount, 'acct'>,
  viewerInstanceUrl: string | undefined,
): string | undefined {
  if (!account.acct) return undefined;
  if (account.acct.includes('@')) return account.acct;
  const host = instanceHostFromUrl(viewerInstanceUrl);
  if (!host) return undefined;
  return `${account.acct}@${host}`;
}
