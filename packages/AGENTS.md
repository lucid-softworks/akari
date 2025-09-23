# Packages Guidelines

Each folder in `packages/` is a standalone TypeScript library that backs the app.

- Keep source code in `src/` with tests either alongside the modules (`*.test.ts`) or in `__tests__/` directories. Update `src/index.ts` to export any new public APIs.
- Use `type` aliases for shared shapes and response payloads. Do not introduce `interface` unless merging is required.
- Handle HTTP calls with async/await and throw `Error` instances that include meaningful messages. Reuse existing helper methods (such as `makeRequest` in the API clients) instead of duplicating fetch logic.
- Use `msw` when writing tests for HTTP interactions. Reset handlers between tests as shown in the existing suites.
- When modifying a package, run `npm run lint -- --filter=<package>` and the matching test command (`npm run test -- --filter=<package>` or the package-level script) before finalising your PR.
- Packages must not import from `apps/`. Shared code should move into a package if it needs to be reused by the app.
- Keep dependencies lean and ensure `package.json` stays accurate when new external libraries are introduced.
