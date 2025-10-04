# Microcosm Links API Package Guidelines

- Keep HTTP utilities inside `MicrocosmApiClient` and let higher level APIs extend it.
- Model request and response payloads as `type` aliases in `types.ts` and export them via `src/index.ts`.
- Add Jest tests that cover success and failure flows using `msw`.
