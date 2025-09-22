# Virtualized List Migration Checklist

Tracking the screens and surface areas that still rely on legacy `FlatList`/`ScrollView` implementations. Check items off as they are migrated to the shared `VirtualizedList` component.

## App Tabs
- [x] `(tabs)/bookmarks`
- [x] `(tabs)/search`
- [x] `(tabs)/notifications`
- [x] `(tabs)/messages/index`
- [x] `(tabs)/messages/[handle]`
- [x] `(tabs)/settings`
- [x] `(tabs)/profile`

## Profile Surfaces
- [x] `components/profile/PostsTab`
- [x] `components/profile/RepliesTab`
- [x] `components/profile/LikesTab`
- [x] `components/profile/MediaTab`
- [x] `components/profile/VideosTab`
- [x] `components/profile/FeedsTab`
- [x] `components/profile/StarterpacksTab`
- [x] `app/profile/[handle]`

## Other Screens
- [x] `app/post/[id]`
- [x] `app/debug`

## Tests
- [x] Update screen and profile tab tests for `VirtualizedList`
