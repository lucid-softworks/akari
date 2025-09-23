# ClearSky API Package Guidelines

- `ClearSkyApiClient` offers `get` and `post` helpers that handle query-string construction and JSON serialisation. Use them for every endpoint instead of duplicating `fetch` logic.
- Always `encodeURIComponent` user-provided segments (handles, DIDs, pagination cursors) before concatenating them into URLs. Tests in `api.test.ts` assert the encoded paths.
- Mirror the existing pagination pattern: accept an optional `ClearSkyPaginationOptions` object and branch on `page` like `getList` and `getBlocklist` do.
- Define request/response shapes in `types.ts` with `type` aliases. Keep naming consistent with the ClearSky API responses.
- Add `msw`-based tests for new endpoints covering both happy paths and error handling.
- Document each method with a short JSDoc block describing the endpoint path and returned data to match the existing style in `api.ts`.
