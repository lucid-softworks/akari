# Components Guidelines

This guide applies to everything under `apps/akari/components` unless a deeper `AGENTS.md` overrides it.

## Composition and imports
- Implement components as typed function components. Declare prop shapes with `type` aliases and avoid `interface`.
- Resolve modules through the `@/` alias (for example `@/components/ThemedView`) rather than long relative paths.

## Data and hooks
- Keep components primarily presentational. Fetch data, trigger mutations, and derive derived state through hooks from `apps/akari/hooks` (`useFeed`, `useLikePost`, `useTranslation`, etc.).
- Never call `fetch` or instantiate API clients directly inside a component—delegate to hooks that encapsulate the behaviour.

## Theming and layout
- Use the themed primitives (`ThemedView`, `ThemedText`, `ThemedCard`, `Panel`, `ThemedFeatureCard`) plus `useThemeColor` to honour the light/dark palettes. Pair any hard-coded colour literals with a theme lookup, as seen in `PostCard` and `Panel`.
- Lists should rely on `components/ui/VirtualizedList` or FlashList via that wrapper so scroll performance and measurement remain consistent across platforms.
- Reuse `useResponsive`, `useSafeAreaInsets`, and other layout hooks from the `hooks/` directory when building adaptive layouts.

## Accessibility
- Provide `accessibilityRole`, `accessibilityLabel`, and/or `accessibilityHint` for every interactive control. Follow the patterns in `PostCard`, `ProfileHeader`, and modal components for labelling icon-only buttons.
- Ensure actions exposed through menus or touch targets also have translated strings for screen readers via `useTranslation`.

## Loading states and skeletons
- Place skeleton components in `components/skeletons` and export them via `components/skeletons/index.ts`. Prefer the `withSkeleton` higher-order component when toggling between loading and loaded UI.
- When showing placeholder imagery or avatars, mirror the structure of the finished component so layout shifts are minimal.

## Testing
- Add tests for new components under `apps/akari/__tests__/components` (or nested folders such as `profile/`). Use Testing Library queries in the priority documented in `apps/akari/__tests__/AGENTS.md`.
- Mock heavy child components (image viewers, embeds) only when necessary to keep tests focused on the component under test.
