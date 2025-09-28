# Constellation API Package Guidelines

- Keep HTTP helpers inside `ConstellationApiClient`. Higher-level APIs should compose those helpers rather than calling `fetch` directly.
- Define response and query `type` aliases in `types.ts` and re-export them through `src/index.ts`.
- Cover happy paths and error handling in Jest tests with `msw` handlers.
