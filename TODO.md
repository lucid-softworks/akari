# TODO

Outstanding work, organised by priority. Items here are *not yet
implemented*; everything that's already shipped lives in `git log`.

## P1 — official-app parity gaps

- **Feed filters.** Per-feed filtering rules (minimum like count,
  exclude / include specific users, keyword filters, media-only, etc.)
  applied at render time so filtered posts disappear from the
  rendered list. Needs a settings UI to author rules per feed and a
  filter-pass plugged into every feed renderer (home, custom feeds,
  profile tabs).
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
- `moderation.tsx`: `mutedWordsTags` => TODO "Mute words / tags"
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

- **Mute words / tags.** Settings UI + filter pass over feed text and
  facets. Lexicon is the user's
  `app.bsky.actor.preferences#mutedWordsPref`.
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
