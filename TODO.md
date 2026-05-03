# TODO

Outstanding work, organised by priority. Items here are *not yet
implemented*; everything that's already shipped lives in `git log`.

## P0 — security / correctness

- **Remove hardcoded encryption key in `secureStorage.ts`.** The key is
  embedded in the source; anyone with the bundle can decrypt the
  on-device store. Replace with a per-install key derived from the
  device keychain.

## P1 — official-app parity gaps

- **Verification — creds.blue + opt-out.** Blue check rendering on
  posts and profiles plus the verifier-list sheet are shipped via
  `VerificationBadge` / `VerifiersSheet`, but only honor the
  appview-supplied `app.bsky.actor.defs#verificationState`. Still
  pending: pull verification records directly from third-party
  verifiers (notably **creds.blue**, `did:plc:stznz7qsokto2345qtdzogjb`,
  collection `app.bsky.graph.verification`) and merge them into the
  badge / sheet, plus a settings toggle to opt out of seeing
  verification entirely.
- **Feed filters.** Per-feed filtering rules (minimum like count,
  exclude / include specific users, keyword filters, media-only, etc.)
  applied at render time so filtered posts disappear from the
  rendered list. Needs a settings UI to author rules per feed and a
  filter-pass plugged into every feed renderer (home, custom feeds,
  profile tabs).
- **Image carousel for multi-image embeds.** Today a post with 2+
  images shows a static grid; the official app renders a horizontal
  pager with page dots and swipe.
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
