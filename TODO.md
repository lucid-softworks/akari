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
