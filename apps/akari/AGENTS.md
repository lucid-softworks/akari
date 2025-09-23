# Apps › Akari Guidelines

This directory contains the Expo Router application. Follow these patterns when working anywhere under `apps/akari` unless a more specific `AGENTS.md` overrides them.

## Architecture and routing
- The app uses Expo Router. Screen files under `app/` must default-export the screen component and respect folder-based routing such as `(tabs)` and `(auth)`.
- Organise shared UI in `components/`, data access in `hooks/`, global state in `contexts/`, and helpers in `utils/`. Reuse these areas rather than creating ad-hoc modules alongside screens.
- Import modules using the `@/` alias defined in `tsconfig.json` to keep paths short and consistent.

## Data fetching and mutations
- All network calls go through React Query hooks in `hooks/`. Create new read operations in `hooks/queries` with `useQuery`/`useInfiniteQuery`, mirroring the guard clauses in `useFeed`, `useTimeline`, or `useCurrentAccount` (check for tokens, DIDs, or required identifiers before calling APIs).
- Mutation hooks belong in `hooks/mutations`. They should update React Query caches or persisted storage just like `useSetSelectedFeed`, `useLikePost`, or `useAddAccount`.
- Instantiate API clients from the packages (`@/bluesky-api`, `@/clearsky-api`, `@/tenor-api`, `@/libretranslate-api`) inside hooks rather than inside components.

## Theming and layout
- Use the themed primitives—`ThemedView`, `ThemedText`, `ThemedCard`, `Panel`, etc.—plus `useThemeColor` to obtain palette-aware colours. Hard-coded colour strings should appear only alongside theme lookups as shown in `Panel.tsx`.
- Prefer `components/ui/VirtualizedList` (FlashList wrapper) for scrollable collections so measurement and overscan behave consistently across screens. Register lists with `tabScrollRegistry` when they need scroll-to-top support, as in `app/(tabs)/index.tsx`.
- Leverage `useResponsive` and `useSafeAreaInsets` for adaptive layouts, especially on tablet and desktop form factors.

## Strings and localisation
- Retrieve user-facing copy via `useTranslation()` and keys stored in `translations/*.json`. Do not inline strings in components or hooks.
- When adding a new translation key, update every locale file—see `apps/akari/translations/AGENTS.md` for formatting rules.

## State, contexts, and storage
- Use the context providers under `contexts/` (`DialogContext`, `LanguageContext`, `ToastContext`) to surface global UI instead of duplicating logic per screen.
- Persist values through the utilities in `utils/secureStorage` and the mutations that wrap them; avoid calling storage APIs directly from components.

## Testing expectations
- Place tests for screens, components, hooks, and utilities under `apps/akari/__tests__`. The testing guide in that directory documents query priorities, MSW usage, and coverage requirements.
- Reuse the helpers in `apps/akari/test-utils` (for example the FlashList mock) to stabilise behaviour in tests.
