# Slingshot API Package Guidelines

- Keep HTTP helpers inside `SlingshotApiClient`. Higher-level APIs should compose those helpers rather than calling `fetch` directly.
- Slingshot is an *edge cache* over atproto records. Only endpoints it actually exposes belong here: `com.atproto.repo.getRecord` and `com.atproto.identity.resolveHandle`. `listRecords` and `resolveDid` are NOT slingshot endpoints (verified — slingshot returns 404).
- Define response and query `type` aliases in `types.ts` and re-export them through `src/index.ts`.
- Cover happy paths and error handling in Jest tests with `msw` handlers.
