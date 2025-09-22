# Virtualized List Migration TODO

The FlashList-backed `VirtualizedList` component in `apps/akari/components/ui/VirtualizedList.tsx` is the new standard list implementation. The feed and notifications tabs already use it; the items below still depend on React Native's `FlatList`. Use this checklist to migrate everything over.

## App screens
- [ ] `apps/akari/app/(tabs)/messages/index.tsx`
  - Replace the `FlatList` import with `VirtualizedList` and update `flatListRef` to `React.useRef<VirtualizedListHandle<Conversation>>`.
  - Pass an `estimatedItemSize` that matches the conversation row height and keep `overscan` conservative so the request list stays responsive.
  - Verify `tabScrollRegistry`'s scroll-to-top helper still works and that footer/empty states render correctly after the swap.
- [ ] `apps/akari/app/(tabs)/messages/[handle].tsx`
  - Swap the conversation `FlatList` for `VirtualizedList`, keeping `inverted` pagination behaviour intact.
  - Provide an `estimatedItemSize` for message bubbles and confirm the `ListFooterComponent` continues to show the loading indicator while paging.
  - Re-check `onEndReachedThreshold` against FlashList's behaviour so we do not over-fetch.
- [ ] `apps/akari/app/(tabs)/search.tsx`
  - Replace the `FlatList`/`useRef<FlatList>` pair with `VirtualizedList` and `VirtualizedListHandle<SearchResult>`.
  - FlashList expects `refreshing`/`onRefresh` props rather than a `RefreshControl` element—rework pull-to-refresh accordingly.
  - Supply an `estimatedItemSize` that balances profile and post rows, and keep the tab scroll registry hook working.
- [ ] `apps/akari/app/(tabs)/bookmarks.tsx`
  - Use `VirtualizedList` instead of `FlatList`, updating the ref type to `VirtualizedListHandle<BlueskyBookmark>`.
  - Convert the `RefreshControl` usage to FlashList-style refreshing and ensure header/footer/empty states render through the wrapper.
  - Choose an `estimatedItemSize` that matches a `PostCard` to keep overscan tight.

## Profile tabs
- [ ] `apps/akari/components/profile/PostsTab.tsx`
  - Replace the `FlatList` with `VirtualizedList`, disable scrolling the same way, and provide an `estimatedItemSize` suited to `PostCard` entries.
  - Confirm pagination still triggers via `onEndReached` and that the loading footer stays visible while fetching.
- [ ] `apps/akari/components/profile/MediaTab.tsx`
  - Swap to `VirtualizedList` and adjust the filtered media list to provide an `estimatedItemSize`.
  - Keep `scrollEnabled={false}` behaviour and verify reply metadata still renders through the virtualization.
- [ ] `apps/akari/components/profile/LikesTab.tsx`
  - Move to `VirtualizedList` with an appropriate `estimatedItemSize` and maintain the non-scrollable embedding inside parent tabs.
  - Re-test pagination and footer rendering.
- [ ] `apps/akari/components/profile/RepliesTab.tsx`
  - Replace `FlatList` usage, add an `estimatedItemSize`, and ensure the component still exposes an accessible list role (tests rely on `getByRole('list')`).
  - Double-check `onEndReached` throttling so mutation hooks do not fire repeatedly.
- [ ] `apps/akari/components/profile/VideosTab.tsx`
  - Switch to `VirtualizedList`, provide media-appropriate sizing, and maintain the existing non-scrollable behaviour.
  - Validate the loading footer and empty states once FlashList is in place.
- [ ] `apps/akari/components/profile/FeedsTab.tsx`
  - Use `VirtualizedList` for the author feed list, taking care with custom cards and `scrollEnabled={false}`.
  - Provide an `estimatedItemSize` and make sure the `IconSymbol` interactions remain accessible.
- [ ] `apps/akari/components/profile/StarterpacksTab.tsx`
  - Replace `FlatList` with `VirtualizedList`, wire up an `estimatedItemSize`, and verify the card styling survives FlashList's item container.
  - Confirm pagination, footer, and empty state behaviour after the migration.

## Shared components
- [ ] `apps/akari/components/GifPicker.tsx`
  - Swap the GIF grid to `VirtualizedList`, keeping `numColumns`, `ListFooterComponent`, and `ListEmptyComponent` working.
  - FlashList needs an `estimatedItemSize` for grid tiles—base it on the GIF thumbnail height.
  - Re-run the infinite scroll logic to ensure `onEndReached` continues to request additional Tenor pages.
- [x] `apps/akari/components/HandleHistoryModal.tsx`
  - Use `VirtualizedList` for the history list, set an `estimatedItemSize`, and keep the modal layout constraints intact.
  - Verify the divider styling still renders between items when FlashList virtualizes them.

## Tests
- [ ] `apps/akari/__tests__/app/tabs/messages-index.test.tsx`
  - Update the test to render and inspect `VirtualizedList` instead of `FlatList`, including scroll-to-top assertions.
- [ ] `apps/akari/__tests__/app/tabs/messages-handle.test.tsx`
  - Adjust imports and `UNSAFE_getByType` calls to point at `VirtualizedList`, and confirm inverted pagination continues to trigger `onEndReached`.
- [ ] `apps/akari/__tests__/app/tabs/messages-pending.test.tsx`
  - Point list queries at `VirtualizedList` and make sure pending state footers still render via the wrapper.
- [ ] `apps/akari/__tests__/app/tabs/search.test.tsx`
  - Update mocks and queries to use `VirtualizedList`, and adapt refresh assertions to the new `refreshing`/`onRefresh` API.
- [ ] `apps/akari/__tests__/components/profile/PostsTab.test.tsx`
  - Replace the `FlatList` import, update `UNSAFE_getByType` references, and keep pagination tests working with FlashList.
- [ ] `apps/akari/__tests__/components/profile/MediaTab.test.tsx`
  - Point assertions at `VirtualizedList` and verify loading footer expectations.
- [ ] `apps/akari/__tests__/components/profile/LikesTab.test.tsx`
  - Update the list component under test to `VirtualizedList` and adjust any scroll/pagination mocks.
- [ ] `apps/akari/__tests__/components/profile/VideosTab.test.tsx`
  - Swap to `VirtualizedList` assertions and ensure pagination events still fire.
- [ ] `apps/akari/__tests__/components/profile/StarterpacksTab.test.tsx`
  - Update imports and `UNSAFE_getByType` usage, keeping footer expectations intact.
- [ ] `apps/akari/__tests__/components/profile/FeedsTab.test.tsx`
  - Point the test at `VirtualizedList` so end-reached assertions continue to pass.
- [ ] `apps/akari/__tests__/components/FeedsTab.test.tsx`
  - Update component queries to account for `VirtualizedList` and confirm `onEndReached` firing.
- [ ] `apps/akari/__tests__/components/GifPicker.test.tsx`
  - Use `VirtualizedList` in place of `FlatList`, adjust grid assertions, and keep `onEndReached` events wired up.

Once each item is migrated, re-run the relevant Jest suites to confirm FlashList behaves the same as the legacy `FlatList` implementations.
