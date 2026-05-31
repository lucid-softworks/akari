/**
 * Sentinel feed keys for Mastodon. The home tab's `useSelectedFeed`
 * persists the selected feed as a string; for atproto it's an `at://`
 * URI (or the literal `'following'`). For Mastodon there is no such
 * thing as a feed-generator URI — the two timelines exposed by the API
 * (home + trending) get short, namespaced sentinels here so the
 * persistence layer doesn't need a separate `mastodonSelectedFeed` key.
 *
 * The `mastodon-` prefix lets readers cheaply discriminate which protocol
 * the persisted value came from, in case an atproto user signs out and
 * a Mastodon user signs in on top of stale storage.
 */
export const MASTODON_HOME_FEED = 'mastodon-home' as const;
export const MASTODON_TRENDING_FEED = 'mastodon-trending' as const;

export type MastodonFeedKey = typeof MASTODON_HOME_FEED | typeof MASTODON_TRENDING_FEED;

export function isMastodonFeedKey(value: string | null | undefined): value is MastodonFeedKey {
  return value === MASTODON_HOME_FEED || value === MASTODON_TRENDING_FEED;
}
