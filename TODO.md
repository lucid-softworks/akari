# TODO

Outstanding work, organised by priority. Items here are *not yet
implemented*; everything that's already shipped lives in `git log`.

## P1 — official-app parity gaps

- **Real account creation.** `password.tsx`'s "signup" mode is a
  label-only distinction — the "Connect account" button calls the same
  `signInMutation` as sign-in, so it only authenticates against existing
  PDS accounts. Wire `com.atproto.server.createAccount` into a real
  signup mutation (handle, email, password, optional invite code) so
  users can create accounts on any PDS without leaving the app. Declared
  to Google Play as a not-yet-supported method on 2026-05-04.

- **Feed filters — propagate beyond the home tab.** Per-feed filter
  sheet shipped on the home tab (toggles for hiding replies / reposts
  / quote posts, only-following / only-mutuals, and min/max ranges
  for likes / reposts / replies / bookmarks; persisted per feed URI
  in MMKV via `useFeedFilters`). Still TODO: wire the same filter
  pass into the profile post tabs and any other feed-list surfaces
  so the toggles apply globally as users expect.
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

## P1 — settings screens (~41 stubbed rows)

Each row below currently routes through `useNotImplementedToast`.
Items marked **(=> TODO)** also unblock a separate P1 item — knock
those out together.

**Local-prefs only** — same shape as `useFeedSettings`; just MMKV +
a Switch.
- `content-and-media.tsx`: `threadPreferences` (sort order picker,
  prioritise-followed-replies toggle), `externalMedia` (per-provider
  on/off list — YouTube, Twitter/X, Tenor, Spotify, etc.)
- `languages.tsx`: `contentLanguages` (multi-select language list,
  also writes to `app.bsky.actor.preferences#contentLanguagesPref`)

**Behaviour gating for prefs that already persist** — the toggles are
saved but don't yet drive a label-filtering pass.
- `enableAdultContent` (moderation.tsx) — persists locally but no
  feed pass exists yet. Need to identify Bluesky's adult labels
  (`porn`, `sexual`, `nudity`, `graphic-media`), add a filter pass to
  every feed renderer, and wire a blur/warning overlay on individual
  posts. Should also round-trip to
  `app.bsky.actor.preferences#adultContentPref` so the choice
  follows the user across clients.

**List views over existing data** — Bluesky already returns these
via `getPreferences` / `getMutes` / `getBlocks`; just need a list UI.
- `moderation.tsx`: `mutedAccounts`, `blockedAccounts`

**Cross-feature with TODO**
- `notifications.tsx`: `notificationCategories` => TODO
  "Notification settings categories"
- `content-and-media.tsx`: `manageSavedFeeds` => TODO "Custom feed
  pins"

**Account / security flows** — require Bluesky API integration;
several are destructive and need confirmation flows.
- `account.tsx`: `email`, `updateEmail`, `password`, `birthday`,
  `exportData`, `deactivateAccount`, `deleteAccount`
- `privacy-and-security.tsx`: `twoFactor`, `appPasswords`,
  `notifyOthers`, `loggedOutVisibility`

**Skippable / niche**
- `about.tsx`: `systemLog`
- `moderation.tsx`: `interactionSettings` (overlaps with
  PostComposer's reply-controls)

## P1 — original task list (still pending)

- **Profile tabs — scrollable header + sticky tabs parity.** Banner
  scrolls under the tabs; tabs pin to top once they reach it.
- **Custom feed pins.** Reorder / pin / unpin saved feeds via
  `app.bsky.actor.putPreferences#savedFeedsPref` (or the newer
  `savedFeedsPrefV2`). Drag-and-drop on web is a stretch goal.
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

Per-counter "hide this metric" toggles in settings so a privacy- or
focus-minded user can blank out:

- like / repost / quote / save / reply counts on posts
- follower / following / followed-by counts on profiles

Each is independent; UI should collapse the row entirely when
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
