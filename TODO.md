# Outstanding App TODOs

This checklist aggregates the TODO comments currently in the Akari app so we can track unfinished functionality.

## Profile header actions (`apps/akari/components/ProfileHeader.tsx`)

- [ ] Replace the placeholder "Add to lists" alert with real list management UI or navigation.
- [ ] Implement full mute/unmute handling, including wiring the confirmation alert to an actual API call.
- [ ] Integrate the report account alert with the real reporting API.
- [ ] Export dropdown action handlers here so profile screens reuse them without duplicating stubs.

## Profile screens (`apps/akari/app/(tabs)/profile/[handle].tsx` and `apps/akari/app/(tabs)/profile/index.tsx`)

- [ ] Implement the "Search posts" action exposed in the profile dropdown.
- [ ] Implement the "Add to lists" action exposed in the profile dropdown.
- [ ] Implement the mute/unmute action exposed in the profile dropdown.
- [ ] Implement the block/unblock action exposed in the profile dropdown.
- [ ] Implement the report account action exposed in the profile dropdown.
- [ ] Once the shared handlers exist, consume them here so the dropdown invokes the real mutations.

## Feeds tab (`apps/akari/components/profile/FeedsTab.tsx`)

- [ ] Implement pinning functionality for authored feeds.
- [ ] Reflect pinned state in the UI (and allow unpinning) while invalidating feed queries after pin changes.

## Supporting hooks for profile actions

- [ ] Add shared React Query mutations for muting/unmuting, reporting, and list membership to back the dropdown actions.
- [ ] Invalidate or update profile queries after each action so viewer state refreshes automatically.
- [ ] Provide success and failure feedback (toasts, loading indicators) for each dropdown action.

## Profile dropdown UX improvements

- [ ] Introduce an overlay or backdrop so tapping outside the dropdown closes it consistently.
- [ ] Audit dropdown accessibility (focus management plus roles/labels) once the actions are wired up.

## Testing

- [ ] Add integration tests that cover the full profile action menu once the real mutations are implemented.

---

# Codebase-Wide Improvements

Based on full codebase evaluation (2026-04-02).

---

## 1. Decompose Oversized Components

### 1.1 PostCard.tsx (1,708 lines) -- HIGH PRIORITY
- [ ] Extract `PostHeader` component (author avatar, display name, handle, timestamp, post menu trigger)
- [ ] Extract `PostActions` component (like, repost, reply, share buttons + counts)
- [ ] Extract `PostEmbeds` component (images, video, external links, quote posts, GIFs)
- [ ] Extract `ContentWarning` component (content warning overlay + reveal logic)
- [ ] Extract `RepostIndicator` component (reposted-by banner)
- [ ] Extract `ReplyContext` component (reply-to line and parent post reference)
- [ ] Extract `PostBody` component (rich text content rendering)
- [ ] Parent `PostCard` should become a thin composition shell that wires these together
- [ ] Ensure each sub-component owns its own `StyleSheet` and types
- [ ] Move shared PostCard types to a `PostCard.types.ts` file

### 1.2 Sidebar.tsx (661 lines) -- MEDIUM PRIORITY
- [ ] Extract `AccountSwitcher` component (multi-account list + switch logic)
- [ ] Extract `SidebarNavigation` component (nav links, active state)
- [ ] Extract `SidebarProfile` component (current user avatar, name, handle)
- [ ] Extract `SidebarFooter` component (theme toggle, settings link)

### 1.3 ProfileHeader.tsx (567 lines) -- MEDIUM PRIORITY
- [ ] Extract `ProfileStats` component (followers, following, posts counts)
- [ ] Extract `ProfileActions` component (follow, mute, block, report buttons)
- [ ] Extract `ProfileBanner` component (banner image + avatar overlay)
- [ ] Extract `ProfileBio` component (description, links, joined date)

---

## 2. Deduplicate Mutation Hooks

### 2.1 Create shared optimistic mutation helper -- HIGH PRIORITY
- [ ] Audit all 20 mutation hooks and catalog the shared pattern:
  - Query cancellation
  - Cache snapshot
  - Optimistic cache update
  - Rollback on error
  - Query invalidation on success
- [ ] Create `useOptimisticMutation<TData, TVariables, TContext>()` helper hook that accepts:
  - `mutationFn` -- the actual API call
  - `queryKeysToCancel` -- keys to cancel before optimistic update
  - `optimisticUpdate(variables, queryClient)` -- returns rollback context
  - `onRollback(context, queryClient)` -- restores snapshot
  - `queryKeysToInvalidate` -- keys to invalidate on success
  - Optional `onSuccess`/`onError` callbacks for custom behavior
- [ ] Refactor these hooks to use the shared helper:
  - [ ] `useLikePost`
  - [ ] `useRepostPost`
  - [ ] `useCreatePost`
  - [ ] `useDeletePost`
  - [ ] `useFollowUser`
  - [ ] `useUnfollowUser`
  - [ ] `useMuteUser`
  - [ ] `useUnmuteUser`
  - [ ] `useBlockUser`
  - [ ] `useUnblockUser`
  - [ ] `useUpdateProfile`
  - [ ] `useSendMessage`
  - [ ] Remaining mutation hooks
- [ ] Verify each refactored hook still passes its tests
- [ ] Add tests for `useOptimisticMutation` itself

---

## 3. Fix TypeScript Issues

### 3.1 Navigation type safety -- HIGH PRIORITY
- [ ] Define a central `RootParamList` type covering all routes and their params
- [ ] Register it with Expo Router's type system
- [ ] Remove all `@ts-expect-error` comments in navigation utilities
- [ ] Verify type-safe navigation across the app with `tsc --noEmit`

### 3.2 API response types -- MEDIUM PRIORITY
- [ ] Audit `as any` casts in API response handling
- [ ] Replace with proper types from ATProto type definitions
- [ ] Add strict return types to all BlueskyApi methods
- [ ] Add generic type parameters to API client methods where appropriate

### 3.3 General type cleanup -- LOW PRIORITY
- [ ] Extract inline prop types to named interfaces (components with >5 props)
- [ ] Co-locate prop types with their components
- [ ] Run `tsc --noEmit --strict` and triage new errors

---

## 4. Security

### 4.1 Remove hardcoded encryption key -- HIGH PRIORITY
- [ ] Move the encryption key in `secureStorage.ts` to an environment variable
- [ ] Inject via `expo-constants` from `app.config.ts`
- [ ] Add `.env.example` with a placeholder if one doesn't exist
- [ ] Ensure `.env` is in `.gitignore`
- [ ] Update README with instructions for setting the key
- [ ] Verify MMKV encryption still works on iOS and Android after the change

---

## 5. Error Handling

### 5.1 API error classification -- MEDIUM PRIORITY
- [ ] Create error types in `packages/bluesky-api/`:
  - `NetworkError` -- timeouts, DNS failures, no connectivity
  - `AuthError` -- expired tokens, invalid credentials, revoked sessions
  - `RateLimitError` -- 429 responses with retry-after info
  - `ValidationError` -- malformed requests, invalid parameters
  - `ServerError` -- 5xx responses
- [ ] Update the API client to throw typed errors instead of generic ones
- [ ] Update mutation hooks to handle errors contextually:
  - `AuthError` -> prompt re-authentication
  - `RateLimitError` -> show retry timer
  - `NetworkError` -> show offline indicator
  - `ValidationError` -> show field-level feedback
- [ ] Add toast variants for different error severity levels

### 5.2 Error boundary improvements -- LOW PRIORITY
- [ ] Add error boundaries around individual feed items
- [ ] Add error boundaries around each embed type
- [ ] Add a global "something went wrong" fallback with retry button
- [ ] Log error boundary catches to Axiom crash reporter

---

## 6. Testing

### 6.1 Coverage enforcement -- MEDIUM PRIORITY
- [ ] Set a baseline coverage threshold in `jest.config.js`
- [ ] Add `coverageThreshold` for global, mutations, queries, and utils
- [ ] Add coverage trend reporting to CI

### 6.2 Expand test coverage -- MEDIUM PRIORITY
- [ ] Add tests for the `useOptimisticMutation` helper (once created)
- [ ] Add tests for all mutation hooks (verify optimistic update + rollback)
- [ ] Add tests for `secureStorage.ts`
- [ ] Add tests for `useTranslation` hook edge cases
- [ ] Add tests for navigation utilities
- [ ] Add snapshot tests for key UI components

### 6.3 E2E testing -- LOW PRIORITY
- [ ] Evaluate Maestro or Detox for mobile E2E
- [ ] Add E2E smoke tests for critical flows (sign in, timeline, post, like, profile, DM)
- [ ] Add E2E to CI on preview builds

---

## 7. Performance

### 7.1 Translation lazy loading -- MEDIUM PRIORITY
- [ ] Bundle only English as the default/fallback
- [ ] Load other language files dynamically on language selection
- [ ] Cache loaded language file in MMKV
- [ ] Measure bundle size reduction

### 7.2 Component memoization audit -- LOW PRIORITY
- [ ] Audit feed items for unnecessary re-renders
- [ ] Add `React.memo()` to sub-components with stable props
- [ ] Verify `useCallback`/`useMemo` in hot paths (timeline scrolling)
- [ ] Ensure list `keyExtractor` and `renderItem` are stable references

### 7.3 Image and media optimization -- LOW PRIORITY
- [ ] Audit image loading (thumbnails in feed, full-res on tap)
- [ ] Verify video autoplay only for visible items
- [ ] Check off-screen media cleanup

---

## 8. Code Organization

### 8.1 Shared styles/design tokens -- MEDIUM PRIORITY
- [ ] Create `styles/tokens.ts` with spacing, radius, shadow, typography values
- [ ] Create `styles/common.ts` with reusable style patterns
- [ ] Migrate duplicated inline styles
- [ ] Document the token system

### 8.2 Constants audit -- LOW PRIORITY
- [ ] Consolidate magic numbers into named constants
- [ ] Centralize API URLs and configuration
- [ ] Deduplicate overlapping constant definitions

---

## 9. Documentation

### 9.1 Architecture decision records -- LOW PRIORITY
- [ ] Document React Query choice and patterns
- [ ] Document MMKV encryption strategy and platform differences
- [ ] Document translation pipeline
- [ ] Document monorepo structure and package responsibilities

---

## Priority Summary

| Priority | Items | Focus |
|----------|-------|-------|
| HIGH | 1.1, 2.1, 3.1, 4.1 | PostCard decomposition, mutation dedup, nav types, security |
| MEDIUM | 1.2, 1.3, 3.2, 5.1, 6.1, 6.2, 7.1, 8.1 | Component splits, API types, errors, testing, perf |
| LOW | 3.3, 5.2, 6.3, 7.2, 7.3, 8.2, 9.1 | Polish, E2E, optimization, docs |
