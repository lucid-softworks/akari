/**
 * Mastodon API entities — only the fields the app actually reads, not the
 * full Mastodon schema. Each addition should come with a render-side
 * consumer; keeping this tight makes it obvious when an entire feature
 * (media, polls, custom emoji, edits, etc.) hasn't been wired up yet.
 *
 * Shared across Mastodon-family servers — Pleroma, Akkoma and GoToSocial all
 * return Mastodon-compatible Status/Account payloads on the endpoints we hit.
 */

/** Subset of Mastodon's `Account` entity.
 *
 * Stats (`followers_count` etc) and `header` are optional because compact
 * payloads (e.g. the embedded `account` on a `Status`) elide them — only
 * the dedicated `/api/v1/accounts/:id` fetch returns them. Consumers that
 * need them gate on truthiness.
 */
export type MastodonAccount = {
  id: string;
  /** Local-only username (no domain). Use `acct` for display. */
  username: string;
  /** `user` for local accounts, `user@domain` for federated. */
  acct: string;
  display_name: string;
  /** Profile avatar URL (static, animated variants live on `avatar_static`). */
  avatar: string;
  /** Canonical profile URL. We use this as the cross-protocol account key. */
  url: string;
  /** Bio rendered as HTML — optional because some compact `Account` payloads
   * elide it; suggestions feeds always include it though. */
  note?: string;
  /** Profile banner URL — only present on the dedicated account fetch. */
  header?: string;
  followers_count?: number;
  following_count?: number;
  statuses_count?: number;
  /** Whether this account approves followers manually (`locked` in Mastodon
   * parlance — relevant for the follow button's "Request" vs "Follow"
   * affordance). */
  locked?: boolean;
};

/**
 * A single follow suggestion. Mastodon ships two endpoints —
 * `GET /api/v2/suggestions` returns `[{ source, account }]` (older) or
 * `[{ sources: [...], account }]` (Mastodon 4.3+), and `/api/v1/suggestions`
 * returns a bare `Account[]`. The fetcher in `suggestions.ts` normalises
 * all three shapes into this one so the rest of the app sees a flat list.
 */
export type MastodonSuggestion = {
  account: MastodonAccount;
};

/**
 * Subset of Mastodon's `Relationship` entity returned by follow / unfollow.
 * `following` is the post-action truth — we always reconcile UI from it
 * rather than assuming the action succeeded.
 */
export type MastodonRelationship = {
  id: string;
  following: boolean;
  followed_by: boolean;
  requested: boolean;
};

/**
 * Subset of Mastodon's `Status` entity. `content` is HTML-as-a-string —
 * <p>, <br>, <a>, mention/hashtag <span>s with classes; the renderer is
 * responsible for stripping or parsing it.
 */
export type MastodonStatus = {
  id: string;
  /** ISO-8601 timestamp. */
  created_at: string;
  account: MastodonAccount;
  /** Status body. HTML, may be empty when `spoiler_text` is set. */
  content: string;
  /** Content-warning text. When non-empty, `content` is hidden behind it. */
  spoiler_text: string;
  /** Reblog (boost) wraps another status. When set, this status is a pure
   * "X boosted Y" relay and the consumer should render `reblog` instead,
   * with the outer `account` shown as the booster. */
  reblog: MastodonStatus | null;
  favourites_count: number;
  reblogs_count: number;
  replies_count: number;
  favourited: boolean;
  reblogged: boolean;
  /** Optional in some payloads (Mastodon returns it on `verify_credentials`-
   *  scoped reads, public/anonymous reads omit it). Treat absence as false. */
  bookmarked?: boolean;
  /** Permalink URL for the status on its origin instance. */
  url: string | null;
};
