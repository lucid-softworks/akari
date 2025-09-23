# Hooks Guidelines

This scope covers `apps/akari/hooks`, including both `queries` and `mutations` folders.

## General principles
- Exported members must follow the React hook naming convention (`useX`). Group read hooks in `queries/` and mutations in `mutations/`.
- Hooks should encapsulate side effects so components stay declarative. Share logic through helper hooks instead of duplicating it inside screens.

## Query hooks
- Use `@tanstack/react-query`'s `useQuery`, `useInfiniteQuery`, or `useSuspenseQuery`. Build stable `queryKey` arrays that capture every parameter, mirroring `useFeed` and `useSearch`.
- Guard against missing prerequisites (JWT tokens, account handles, identifiers) before calling remote APIs. Combine these guards with the `enabled` option so React Query does not fire until everything is available.
- Configure caching intentionally—set `staleTime`, `gcTime`, and `initialPageParam`/`getNextPageParam` (for infinite queries) to match the behaviour of adjacent hooks.

## Mutation hooks
- Wrap side effects with `useMutation`. After a mutation resolves, synchronise caches using `queryClient.invalidateQueries`, `setQueryData`, or manual persistence (see `useSetSelectedFeed` and `useAddAccount`).
- Keep mutation payloads typed and narrow. Return structured results rather than mutating external state.

## API clients and utilities
- Instantiate clients from the packages (`@/bluesky-api`, `@/clearsky-api`, `@/tenor-api`, `@/libretranslate-api`) with the current account's PDS URL or API key. Do not call `fetch` directly inside hooks.
- For persisted storage, use helpers from `utils/secureStorage` instead of interacting with MMKV directly. Wrap storage reads in queries when they influence the UI.
- When dealing with device APIs (notifications, haptics, localisation), expose hooks that request permissions and clean up subscriptions (`usePushNotifications`, `useTranslation`, etc.).

## Testing
- Add hook tests under `apps/akari/__tests__/hooks`, using React Query's `QueryClientProvider` wrappers already set up in that directory.
