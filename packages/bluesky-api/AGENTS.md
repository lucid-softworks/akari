# Bluesky API Package Guidelines

- `BlueskyApiClient` in `client.ts` centralises HTTP behaviour. Reuse `makeRequest`/`makeAuthenticatedRequest`/`uploadBlob` when adding endpoints instead of calling `fetch` directly.
- Domain-specific classes (`actors`, `feeds`, `graph`, `notifications`, `conversations`, `search`, `video`, `auth`) should hold related endpoints. When you expose new functionality, place it in the appropriate module and wire it through `BlueskyApi` in `api.ts`.
- Extend response/request types in `types.ts` using `type` aliases. Keep method signatures typed and ensure optional fields match the API.
- Tests (`*.test.ts`) rely on `msw` to assert URLs, headers, params, and error handling. Add coverage for both success and failure paths when creating new endpoints.
- When working with binary uploads, follow the pattern in `uploadBlob` to avoid forcing JSON content types.
- Update `src/index.ts` exports whenever new modules or types become part of the public surface.
