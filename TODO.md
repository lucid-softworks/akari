# TODO

Outstanding work, organised by priority. Items here are *not yet
implemented*; everything that's already shipped lives in `git log`.

## P1 — official-app parity gaps

- **Feed filters — propagate to the profile post tabs.** The per-feed
  filter sheet + filter pass ship on the home tab and the standalone
  feed viewer (shared via `useFeed` + `filterFeedItems`, persisted per
  feed URI in MMKV). Still TODO: apply the same pass to the profile post
  tabs so the toggles are truly global.
- **Activity Subscriptions.** Per-user "ring the bell" toggle that
  pushes a notification on every new post from that account. Lexicon
  is `app.bsky.notification.declaration` + the per-user subscription
  record.
- **Custom labelers.** Subscribe / unsubscribe to third-party labelers
  and per-label `hide` / `warn` / `show` preferences. Pulls from
  `app.bsky.labeler.service` records and threads through the existing
  Labels component.
- **Bot / automated-account self-labeling.** `BotBadge` next to the
  display name plus a settings toggle that writes the
  `app.bsky.actor.profile#labels` self-label.
- **Profile header polish.** Banner-tap lightbox, selectable bio, an
  in-profile post search, known-followers row, Newskie ("new account")
  pill.
- **Hashtag feed screen.** `/tag/[tag]` route with Top / Latest tabs.
  Hashtag taps currently route to `/search?query=#tag`.

## P1 — settings behaviour gaps

Persisted prefs / screens that exist but don't fully drive a runtime
behaviour yet.

- `content-and-media.tsx`: `trendingVideosEnabled` would gate a
  Discover-feed video filter that doesn't exist yet.
- `moderation.tsx`: per-label `contentLabelPref` (show / warn / hide)
  override UI on top of the global `enableAdultContent` toggle. The
  visibility hook (`useLabelVisibility`) already reads these prefs; the
  per-label settings UI to set them is missing.

## P1 — original task list (still pending)

- **Profile tabs — scrollable header + sticky tabs parity.** Banner
  scrolls under the tabs; tabs pin to top once they reach it.
- **Custom feed pins — add-a-feed flow.** Reorder / pin / unpin + the
  put-preferences round-trip ship in `manage-saved-feeds`. Still TODO:
  an add-from-search flow, and (stretch) drag-and-drop reordering on web
  in place of the up/down chevrons.
- **Notification settings categories.** Per-event-type push / in-app
  toggles (likes, reposts, follows, replies, mentions, quotes), backed
  by `app.bsky.notification.putPreferences`.
- **Inline YouTube playback in posts.** Reuse the chat
  `YouTubeEmbed` component for posts that link to a YouTube video,
  replacing the static external-thumb card. Should respect the
  `videoAutoplayEnabled` setting we just added.
- **Suggested users on profile.** "Suggested for you" carousel under
  the profile header, fed by
  `app.bsky.unspecced.getSuggestedFollows`.
- **Trending topics on Search tab.** A topic grid on the empty Search
  tab that uses the same `getTrendingTopics` hook the home trending
  bar already does.
- **PostComposer @ mention typeahead.** Typing `@` in the composer
  doesn't surface a typeahead dropdown of matching actors. The
  `useTypeaheadActors` hook already exists (the right-column
  quickfind and `AddAccountModal` both use it); the work is parsing
  the active `@token` segment out of the input, wiring up the
  results dropdown anchored to the caret, inserting the chosen
  handle, and writing a `app.bsky.richtext.facet#mention` facet
  pointing at the resolved DID so the link survives a handle
  change.

## P1 — multi-protocol (Mastodon / fediverse)

Akari is becoming a multi-protocol client (atproto plus Mastodon and the
wider fediverse: Pleroma, Akkoma, GoToSocial). Login plumbing has landed
behind the `mastodonLogin` feature flag (off by default): the OAuth flow
(`utils/mastodon/*`), the instance-input screen (`app/(auth)/mastodon.tsx`),
the web callback (`app/oauth/mastodon.tsx`), a `provider` discriminator plus
`mastodon` auth blob on `Account`, and a no-op refresh branch. A signed-in
Mastodon account persists and switches correctly but has nowhere to render
yet, which is why the flag stays off. Remaining work, roughly in order:

- **Dispatch at the leaf, not a neutral type.** Rather than coerce two
  shapes through one Post type, the home feed tags each entry with its
  protocol and `FeedPostCard` dispatches to a protocol-native card
  (`AtprotoFeedPostCard` / `MastodonPostCard`). Keeps Mastodon-only fields
  (boosts, CW, custom emoji, instance-relative ids) from polluting the
  atproto types and vice versa. The MVP card landed render-only — extend
  this pattern for threads + profiles next instead of refactoring to a
  neutral view model.
- **Mastodon home + trending timelines.** Home via
  `useMastodonHomeTimeline` (`GET /api/v1/timelines/home`, `max_id`).
  Trending via `useMastodonTrendingTimeline` (`GET /api/v1/trends/statuses`,
  offset-paginated, 404→empty). Switcher between them lives in the home
  tab's Mastodon-specific `MastodonFeedListHeader` (Home / Trending
  tabs). `useHomeFeed` branches on the `mastodon-home` / `mastodon-trending`
  sentinel from `utils/mastodon/feed.ts`; `useSelectedFeed` defaults +
  normalises the persisted value across account switches.
- **Mastodon post card.** Layout mirrors the atproto PostCard (header row
  at top with squircle avatar, body + actions in a contentColumn indented
  past the avatar). Actions bar wires reply (placeholder, disabled until
  the Mastodon composer lands), boost / favourite / bookmark — all
  toggle via `useMastodonStatusAction` (optimistic patch + reconcile from
  server response across home + trending caches). Still owed: media
  attachments, polls, content warnings (`spoiler_text` is dropped, not
  hidden), custom emoji, mention/hashtag/url facet linking.
- **In-app status detail + profile screens.** `/mastodon/status/[id]`
  renders a status with its `context` (ancestors → focused → descendants)
  stacked through `MastodonPostCard`, with a coloured side stripe on the
  focused entry. Profiles share the `/profile/[handle]` URL space with
  atproto — `ProfileScreenDispatcher` picks `MastodonProfileView` vs
  `ProfileView` from the handle's shape (`@` ⇒ Mastodon). Mastodon
  avatars in the feed route through `useNavigateToProfile` so the
  back-stack stays inside the originating tab on native. URLs use the
  full federated acct (`alice@instance.com`) so they're shareable
  across instances; `toFullAcct` appends the viewer host for locals.
  Still owed: Follow button on profile (needs `useMastodonRelationship`
  query), highlighted-focus styling on the status detail's focused row,
  edge handling for cross-instance status URLs (currently we assume the
  id is local to the viewer's instance — true for anything that appeared
  in their home / trending feed, breaks for hand-typed federated URLs).
- **atproto-only tabs hidden for Mastodon.** `filterTabsForProvider` in
  `useTabConfig` drops `community-notes` from the bottom-bar + sidebar
  when the active account is Mastodon. Persisted MMKV config stays
  untouched so switching back to an atproto account restores it. Add
  more atproto-only tabs to `MASTODON_HIDDEN_TABS` as we identify them
  (moderation likely next; messages / bookmarks once we've verified
  they can read Mastodon equivalents).
- **Onboarding (forced).** Two-step post-signin flow lives at
  `app/onboarding/mastodon.tsx` (profile setup: avatar / banner / display
  name / bio / discoverable opt-in) and `app/onboarding/mastodon-follow.tsx`
  (suggested follows via `/api/v2/suggestions` with `/api/v1` fallback).
  Per-account `mastodonOnboardingComplete` MMKV flag is set only at the
  end so closing the app mid-flow routes back to the right step. Guard
  in `(tabs)/_layout.tsx` enforces it. Skips count as "shown."
- **Announcements above the home feed.** Mastodon-only banner above the
  feed (`MastodonAnnouncementsList`) fetches `/api/v1/announcements`,
  dismissable via `/announcements/:id/dismiss` with optimistic cache
  removal. Renders as the in-list `ListHeaderComponent` (scrolls with
  content) rather than in the web sticky wrapper. Still owed: ends_at /
  starts_at badges, reactions, mention/tag link rendering.
- **Write path.** Posting, replies, boosts, favourites, follows beyond
  onboarding, and bookmarks mapped onto the Mastodon API.
- **Notifications + DMs.** `/api/v1/notifications` and direct-message
  timelines through the neutral notification model.
- **Refresh / revocation.** Revisit the `authRefreshHandler` Mastodon
  branch once we confirm which target servers issue refresh tokens.
- **Flip the flag.** Enable `mastodonLogin` once the read path is usable.

## P2 — polish

- **Lightbox transition polish.** Image-tap → fullscreen lightbox
  shared-element transition is currently a fade; should match the
  scale-from-thumbnail animation used in the official app.
- **Hotkeys (web).** `?` opens shortcut help, `j/k` navigation,
  `r/q/l` reply / quote / like, etc.

## Witchsky-inspired ideas

Cribbed from <https://witchsky.app>. Skipping the items that don't
apply to akari (kawaii branding, "no age assurance/location blocks",
"no push notifications", "kept up-to-date" meta-promises).

### Improvements

- **Theme customization.** Color scheme picker plus a hue slider on
  top of the existing palette so users can tint the whole UI.
- **Customizable "post" noun.** Settings field that lets users rename
  "post" to anything (skeet, toot, peep, etc.) wherever the UI
  surfaces the word.
- **Share-link domain choice.** Toggle between `bsky.app/...` and
  `akari.blue/...` (or whatever akari's web domain ends up being)
  when copying / sharing post URLs.
- **stream.place embeds.** Render the inline player for stream.place
  links the same way YouTube / Twitch embeds work.
- **PDSls + bridged-post jump.** "Open in PDSls" action and, for
  bridged posts (Bridgy Fed, etc.), an "Open original" action that
  links to the source fediverse post.
- **Redraft.** Delete + restore a post into the composer in one tap
  so the user can edit-by-redraft.
- **Stricter defaults.** Alt text required for image posts, video
  autoplay off, etc. — gather under a "Defaults" section in settings
  with the akari opinion baked in.
- **Repost icon refresh.** Replace the default repost glyph with
  something more distinctive than two arrows.
- **Video download.** Long-press / overflow-menu action to save the
  underlying video file for posts that embed one.
- **Preserve route on account switch.** Stay on the current screen
  (and ideally scroll position) when switching between accounts
  rather than bouncing back to the home feed.
- **Mutuals label.** Show "Mutuals" instead of "Following" when the
  viewer is also followed back, on profile pills and follow-state
  chips.

### Experiments (settings sub-page)

- **`go.bsky.app` proxy toggle.** Strip / preserve the analytics
  redirect on shared links.
- **See through quote blocks/detachments.** Toggle to render quoted
  posts even when the quoter has blocked the viewer or detached the
  quote.
- **PDSls + fedi-original buttons.** Same as above, but gated behind
  an experiments toggle so it can be hidden by default.
- **Self-trusted verifiers.** Let the user mark accounts as trusted
  verifiers (and themselves operate as one) for the tiered
  verification UI we already ship.
- **Custom Constellation instance.** Override the back-reference
  service URL so users on self-hosted Constellation can point akari
  at it.
- **Disable default app labeler(s).** Toggle to opt out of Bluesky's
  built-in labeler subscriptions.

### Tweaks (settings sub-page)

- Make non-`bsky.social` handles in post text clickable.
- Combine consecutive reposts into a horizontal carousel.
- Fall back to the Discover feed when Following is empty / errors.
- Higher-resolution image rendering toggle.
- Collapse to a single tab when only one feed is pinned.
- Quietly interact with reposts (don't notify the reposter when you
  like / reply to their repost).
- Hide "similar accounts" recommendations on profiles.
- Square avatars (matching labeler avatars) toggle.
- "Squarer UI" toggle that drops the heavily-rounded corners.
- Hide the composer prompt at the top of Following / Discover feeds.
- Use DIDs instead of handles in URLs and share links.
- Translation provider picker (Google / Kagi / Papago /
  LibreTranslate) plumbed into the existing translate action.
- OpenRouter API key field for AI-generated alt text in the
  composer.

### Metrics visibility

Per-counter "hide this metric" toggles. The post like / repost / reply
counts already honor the accessibility settings; still TODO:

- quote and save/bookmark counts on posts
- follower / following / followed-by counts on profiles

Each is independent; the UI should collapse the row entirely when
hidden, not show a `0` or a placeholder.

## Codebase-wide refactors

- **`useOptimisticMutation` shared helper.** Twelve mutation hooks
  hand-roll the same optimistic-update + rollback pattern; consolidate
  into one helper and migrate them.
- **Navigation type safety.** Add a `RootParamList` and stop relying
  on the loose `string` route push that triggers
  `@ts-expect-error` in `utils/navigation.ts`.
- **API error classification.** Wrap fetch errors in tagged classes
  (`NetworkError`, `AuthError`, `RateLimitError`, etc.) so callers can
  branch without string-matching.
