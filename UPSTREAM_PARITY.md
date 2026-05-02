# Upstream Parity Plan

Comparison of `apps/akari` against `bluesky-social/social-app` `main` (latest commits through ~2026-04-30). Focus is **functional gaps** vs the upstream Bluesky client. Some upstream features are intentionally out of scope for Akari — those are listed under "Out of scope" rather than as work items.

This document complements `TODO.md`. Items already tracked there (Quote Post, Lists Management, Video Upload in Composer, Mute Thread, Report flow wiring, Custom Feed Pins) are referenced by name only and not duplicated.

Priorities:
- **P0** — Core Bluesky surface; the absence is user-visible on day one.
- **P1** — Heavily-used surface; missing it makes Akari feel a release behind.
- **P2** — Polish/UX parity.
- **P3** — Nice-to-have; mobile or third-party-client context makes it lower-impact.

---

## P0 — Core surface

### 1. Group chats (DMs)

Upstream is in the middle of a multi-week push to add group chats (internally "group clip clops"). Akari's chat is 1:1 only.

**Current state**
- `hooks/queries/useConversations.ts`, `useMessages.ts`, `useUnreadMessagesCount.ts` model a single peer.
- `hooks/mutations/useSendMessage.ts` sends to `convoId` but has no group-aware paths.
- `app/(tabs)/messages/[handle].tsx` is keyed on a handle — implies one peer.
- `bluesky-api/conversations.ts` exposes `listConversations`, `getMessages`, `sendMessage`, `updateRead` — but no group endpoints (`getConvoForMembers`, `addReaction`, `addMembers`, `leaveConvo`, `updateConvoName`).

**To build**
- Extend `bluesky-api/conversations.ts` with: `getConvoForMembers(members[])`, `createConvo(members[])`, `addMembers`, `removeMembers`, `leaveConvo`, `updateConvoName`, `updateAllRead`.
- New hooks:
  - `hooks/queries/useConvoMembers.ts`
  - `hooks/mutations/useCreateGroupConvo.ts`
  - `hooks/mutations/useAddConvoMembers.ts` / `useRemoveConvoMembers.ts`
  - `hooks/mutations/useLeaveConvo.ts`
  - `hooks/mutations/useUpdateConvoName.ts`
- Route restructure: `app/(tabs)/messages/[handle].tsx` → `app/(tabs)/messages/[convoId].tsx`. Resolve from handle on first navigation (look up or create the 1:1 convo, then route by id).
- New screen: `app/(tabs)/messages/new.tsx` for picking 1+ members and starting a chat.
- New screen: `app/(tabs)/messages/[convoId]/settings.tsx` for group name + members.
- `components/Conversation*` updates: render multi-avatar bubble (1, 2, 3+ members), show sender display name on each message in groups.

**Acceptance**
- Can start a 3-person group from a "New chat" screen.
- Group is named, can be renamed by any member.
- Members can be added/removed; leaver gets a system message.
- 1:1 chats keep their existing UX (no extra group chrome).

---

### 2. Quote posts

Already in `TODO.md` ("Quote Post"). Reaffirming priority and scope here for completeness — this is the single biggest visible gap for a Bluesky client.

**Scope reminder**
- `useCreatePost` accepts `{ text, replyTo, images }` only — needs `embed.record` (or `embed.recordWithMedia` if images attached too).
- Repost button needs a bottom-sheet that offers "Repost" / "Quote post".
- Composer needs to render a quoted-post preview using `RecordEmbed`.
- Optimistic cache update should include the quoted-post ref so the new post renders immediately.

---

### 3. Threadgate / postgate (reply + quote controls)

The lexicon types are already in `bluesky-api/types.ts` (`threadgate`), but there is no UI or mutation. Without it, users cannot restrict replies or quotes on their posts — a feature that exists in the official client and is increasingly expected.

**To build**
- Add `createThreadgate` and `createPostgate` to `bluesky-api/feeds.ts` (write to `app.bsky.feed.threadgate` / `app.bsky.feed.postgate` records keyed off the post rkey).
- `hooks/mutations/useThreadgate.ts` — set/update threadgate alongside post creation.
- Composer additions: a small "Who can reply / quote" picker (Everyone / Mentioned / Followed / Nobody / Combine + lists) that writes the threadgate after `createPost` succeeds.
- Read path: surface the gate state in `PostActions` (e.g. dim/disable Reply if user is not allowed).

**Acceptance**
- Posting with "Mentioned only" creates the post + a matching threadgate record.
- Editing the gate from `PostActionsMenu` updates the existing record.
- Reply button is disabled with a tooltip when the gate excludes the current user.

---

## P1 — Heavily-used surface

### 4. Video upload in composer

Already in `TODO.md` ("Video Upload in Composer"). Scope reminder: it requires the `app.bsky.video.uploadVideo` + `getJobStatus` polling flow, not just `uploadBlob`. Plan to:
- Add `bluesky-api/video.ts` upload helpers (currently the file only resolves playback URLs).
- Add `hooks/mutations/useUploadVideo.ts` returning `{ jobId, state, progress, blob }`.
- Composer: video picker, single-video constraint, alt text field, progress bar, cancel.

### 5. Lists (custom user lists)

Already in `TODO.md` ("Lists Management"). Scope reminder: the gap covers fetching `app.bsky.graph.list` records, list-member management, the list-feed view, mute-list / block-list semantics, and an "Add to list" picker reused from `PostActionsMenu` and `ProfileDropdown`.

### 6. Chat message reactions

Upstream landed reactions (`addReaction`, `removeReaction`, reactions dialog, "remove own reaction on tap").

**Current state**
- `hooks/mutations/useSendMessage.ts` posts text only; no reaction mutation exists.
- `bluesky-api/conversations.ts` has no reaction methods.

**To build**
- API: `addReaction(convoId, messageId, value)`, `removeReaction(...)`.
- Hook: `hooks/mutations/useMessageReaction.ts` with optimistic update on the cached `useMessages` result.
- UI: long-press a message → emoji picker (see #11). Tapping a reaction toggles it; an "Reactions" dialog lists everyone who reacted with which emoji.

**Acceptance**
- Long-press → pick emoji → reaction appears optimistically and persists.
- Tap your own reaction to remove it.
- Reactions appear under the message bubble grouped by emoji with count.

---

### 7. Pinned post

Bluesky surfaces a profile's pinned post above the Posts tab. Akari does not.

**Current state**
- `useProfile` fetches the profile; `pinnedPost` (if set) is on the profile record but not consumed.
- `ProfileHeader.tsx` does not render a pinned post.

**To build**
- Read `pinnedPost` ref from the profile record in `useProfile`.
- New `hooks/queries/usePinnedPost.ts` (resolve URI to `BlueskyPostView`).
- `components/profile/PostsTab.tsx` renders pinned post above the regular feed with a "Pinned" badge.
- New mutation `usePinPost.ts` for the current user — write `pinnedPost` to the profile record.
- `PostActionsMenu` entry: "Pin to profile" / "Unpin from profile" when `authorDid === currentDid`.

**Acceptance**
- Other users' pinned posts appear at the top of their Posts tab.
- Current user can pin/unpin from the post action menu and the change is reflected immediately.

---

### 8. Thread publishing (multi-post)

Upstream composer can publish a thread of N posts in one submission and skips empty ones (`b8cabfa`).

**Current state**
- `PostComposer.tsx` is single-textbox; `useCreatePost` accepts one post.

**To build**
- Composer: add an "Add another post" button that grows an array of drafts; render them stacked.
- Mutation: a new `useCreateThread` that calls `createPost` sequentially, threading replies via the prior post's URI/CID, and skips drafts where `text.trim() === '' && images.length === 0`.
- Per-draft images, alt text, threadgate apply only to the first post.

**Acceptance**
- Publishing 3 drafts produces a chain visible in `PostThread`.
- Empty middle drafts are skipped, not submitted.
- Failure mid-thread leaves earlier posts intact and surfaces a retry for the rest.

---

### 9. Image carousel in post embeds

Upstream replaced the image grid with a carousel (`[APP-1934] replace image grid layout with carousel`).

**Current state**
- `components/post/PostEmbeds.tsx` renders a static grid for `app.bsky.embed.images`.

**To build**
- Replace grid with horizontal pager (FlatList with `pagingEnabled`, snap to width).
- Show page-indicator dots when `images.length > 1`.
- Tap opens `ImageViewer` at the active index.
- Keep aspect ratio of the first image to size the carousel container.

**Acceptance**
- 2–4 image post shows one image at a time with dots; swiping changes the image.
- A11y: each image still has its alt text exposed via `accessibilityLabel`.

---

### 10. Hashtag feed screens

Tapping a hashtag should land on a dedicated tag feed, not a search query that the user has to re-trigger.

**Current state**
- Hashtag taps in `RichTextWithFacets.tsx` route to search.
- No `app/tag/[tag].tsx` screen.

**To build**
- New route: `app/(tabs)/search/tag/[tag].tsx` (or top-level `app/tag/[tag].tsx`).
- New hook: `hooks/queries/useHashtagFeed.ts` — wraps `searchPosts({ q: '#tag', sort: 'latest'/'top' })` with infinite scroll.
- Tabs: "Top" / "Latest".
- `RichTextWithFacets` link target updated.

**Acceptance**
- Tapping `#bookwyrm` lands on `/tag/bookwyrm` with Top/Latest tabs and an infinite list.

---

## P2 — Polish & UX parity

### 11. Emoji picker for composer + reactions

Upstream shipped a dedicated `EmojiPicker` component (`a97b15b`).

**To build**
- New `components/EmojiPicker.tsx` — categorised, searchable, recent emojis (persist in MMKV).
- Use `unicode-emoji-json` or similar for categories; render with a virtualized grid.
- Wired into `PostComposer` (insert at cursor) and chat reaction long-press (#6).

**Acceptance**
- Insert emoji into composer at cursor position.
- Reaction long-press surfaces the same picker.
- Recents persist across launches.

### 12. Lightbox transition polish

Upstream lazily measures thumbnails and animates the border radius during open/close (`3358e19`, `e58feae`, `ae0c2e8` for web scale).

**Current state**
- `components/ImageViewer.tsx` opens without shared-element animation.

**To build**
- Capture source thumbnail layout (`measureInWindow`) at open; reanimated `withTiming` from source rect → fullscreen rect; interpolate `borderRadius` from source → 0.
- Reverse on close.
- On web, scale-from-thumbnail rather than fade (matches upstream).

**Acceptance**
- Open/close animation visibly transitions from the in-feed thumbnail rect.
- No layout jump if the source unmounts during the transition (fall back to fade).

### 13. Composer drafts

Upstream doesn't have explicit draft persistence either, but for parity-with-app-quality this is worth doing. Many users open the composer, get distracted, and lose their text.

**To build**
- Persist composer state (text, images, replyTo, threadgate, draft chain) to MMKV under `composer:draft:<currentDid>`.
- Restore on `PostComposer` mount; clear after successful post.
- Add a "Save draft / Discard" prompt on close when content is non-empty.

**Acceptance**
- Closing composer with text saves it; reopening restores it.
- Successful publish clears the draft.

### 14. GIF provider — Tenor → KLIPY

Upstream migrated GIFs from Tenor to KLIPY (`a77b6e3`, `[APP-2066]`).

**Current state**
- `packages/tenor-api`, `components/GifPicker.tsx` use Tenor.

**Decision needed**: this is a Bluesky-side embed-resolver change as well. If Akari standalone is fine continuing with Tenor (since it's an independent client), keep it. If matching upstream's embed metadata is important (so quoted GIF posts render the same way for everyone), migrate.

If migrating:
- Add `packages/klipy-api/` mirroring `packages/tenor-api/` shape.
- Swap `GifPicker.tsx` to the new client behind a feature flag for one release, then remove Tenor.

### 15. Native language detection (replace `lande`)

Upstream replaced the `lande` translation-language detection library with a native-platform detector (`1c38665`). Akari likely never used `lande` in the first place — verify.

**Current state**
- `hooks/queries/useLibreTranslateLanguages.ts` lists supported languages but I see no client-side detection of post language for "Translate" prompts.

**To build (if not present)**
- iOS: `NLLanguageRecognizer` via a small Expo module or `expo-localization` extension.
- Android: `MlKit.languageId` or a manual frequency-based fallback.
- Web: `navigator.language` + heuristic.
- Hook: `hooks/useDetectLanguage.ts` returning a BCP-47 tag with confidence.
- Use it in `PostTranslation.tsx` to skip the translate offer when the post is already in the user's content language.

### 16. Suggested users — "see more" + new endpoints

Upstream added a "See more" link in the profile-header suggested-users block and switched to new endpoints (`a049a65`, `2262040`).

**Current state**
- `ProfileHeader.tsx` doesn't have a suggested-users block at all.

**To build**
- New hook: `hooks/queries/useSuggestedFollows.ts` (`app.bsky.graph.getSuggestedFollowsByActor`).
- Component: a horizontal list of suggested actors under `ProfileHeader` when viewing someone you don't follow.
- "See more" routes to a full screen that paginates the same endpoint.

### 17. Trending topics

`bluesky-api/feeds.ts:getTrendingTopics` exists but is only consumed by `GifPicker`. Bluesky surfaces it on the Search/Discover surface.

**To build**
- Render trending topics as a horizontal chip list at the top of the Search tab when the query is empty.
- Tapping a topic routes into the hashtag feed (#10) or search.

### 18. `muteActorList` / `muteThread` hooks

`bluesky-api/graph.ts` exposes both, but no React Query hook consumes them. `TODO.md` already lists "Mute thread" — add `Mute list` alongside it under the same parent.

**To build**
- `hooks/mutations/useMuteThread.ts` with optimistic toast.
- `hooks/mutations/useMuteList.ts` (depends on Lists, #5).
- Wire `Mute thread` into `PostActionsMenu`.

### 19. Profile tab consistency (sticky header on all tabs)

Already in `TODO.md` ("Profile Tabs — Scrollable Header with Sticky Tabs"). Reaffirming P2 priority.

---

## P3 — Lower priority / mobile context

### 20. Hotkeys / global keyboard shortcut handler

Upstream landed a global hotkey handler (`cca3326`) and `/` to focus search across keyboard layouts (`3ff40e9`). Mobile-first context makes this less urgent, but the web build benefits.

**Scope (web only initially)**
- New `hooks/useHotkey.ts`.
- Bind: `n` = new post, `/` = focus search, `g h` = home, `g n` = notifications, `g m` = messages, `j`/`k` = next/prev item in feed, `l` = like focused post, `r` = reply to focused post.

### 21. Age assurance gate on chat settings

Upstream requires age assurance for chat settings (`d58ff89`). Akari doesn't have age-assurance plumbing. Out of scope unless we ship to App Store / Play Store under their content rules — defer.

### 22. GrowthBook gates

Upstream uses GrowthBook for staged feature rollout. Akari doesn't have a feature-flag system. If we add complex features (groups, threadgate), a tiny in-house gate (MMKV-backed) is enough — no need to adopt GrowthBook.

---

## Out of scope (intentional differences)

These are upstream features Akari likely shouldn't pursue:

- **bskyembed / oEmbed landing page** — we don't host an embed renderer.
- **GrowthBook gates** — see #22; in-house gate suffices.
- **`pal` style cleanup** — Akari doesn't use `pal`; this is upstream-internal cleanup.
- **`tsgo` for typechecking** — toolchain choice, no user impact.
- **eslint-plugin-simple-import-sort upgrades** — same.
- **Bluesky video service migration** — the back-end is Bluesky's; we consume URLs via `resolveBlueskyVideoUrl`, no client work needed.

---

## Suggested sequencing

Roughly two-week chunks, assuming one engineer:

1. **Sprint 1 (P0 foundation)** — Quote posts (#2) + Threadgate (#3). Both touch the composer; do them together.
2. **Sprint 2 (P0 chat)** — Group chats #1, paired with chat reactions #6 since they share the convo screen.
3. **Sprint 3 (P1 media)** — Video upload #4 + image carousel #9. Both are media-rendering work.
4. **Sprint 4 (P1 graph)** — Lists #5 + pinned post #7 + `muteList`/`muteThread` hooks #18.
5. **Sprint 5 (P1 composer)** — Thread publishing #8 + drafts #13.
6. **Sprint 6 (P2 polish)** — Emoji picker #11, lightbox transitions #12, hashtag screens #10, suggested users #16, trending topics #17.
7. **Web/long-tail** — Hotkeys #20, GIF migration #14 if/when chosen.

---

## Open questions

- **Group chats** — should the existing handle-keyed `/messages/[handle]` deep links keep working? (Yes, recommend redirecting to the resolved convoId on first hit.)
- **Threadgate** — do we want per-account default gate settings (e.g. "always followers-only")? Not in scope for v1.
- **GIF provider** — keep Tenor or migrate to KLIPY? Need a product call.
- **Drafts** — single draft per account, or named draft slots? Recommend single for v1.
- **Quote-post embedded with media** — `embed.recordWithMedia` is more code; do we ship quote-only first and add media-quote later? Recommend yes.
