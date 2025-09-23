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
