# Akari Monorepo Agent Guidelines

## Repository-wide workflow
- Title pull requests with the Conventional Commits prefix that best matches the change (for example `feat:`, `fix:`, `docs:`).
- Run `npm run lint -- --filter=akari` (and any other impacted workspace scripts) before calling the PR tool. Resolve lint failures locally.
- Keep the worktree clean—only committed changes are evaluated. Stage and commit logically related updates together.
- Always read nested `AGENTS.md` files. Directories define additional rules that override or extend these base expectations.

## TypeScript and coding style
- Prefer `type` aliases over `interface` declarations across the entire repository.
- Iterate with `for...of` instead of `Array.prototype.forEach` to match the existing style.

## Directory guides
- `apps/akari` — Expo application source. See `apps/akari/AGENTS.md`.
- `apps/akari/components` — UI components. See `apps/akari/components/AGENTS.md` and nested guides.
- `apps/akari/hooks` — React Query and utility hooks. See `apps/akari/hooks/AGENTS.md`.
- `apps/akari/__tests__` — Unit and integration tests. See `apps/akari/__tests__/AGENTS.md`.
- `apps/akari/translations` — Locale files. See `apps/akari/translations/AGENTS.md`.
- `packages` — Shared API clients. See `packages/AGENTS.md` and the package-specific guides within each subdirectory.

Run the relevant `npm run test`/`npm run test:coverage` commands for the areas you modify so CI remains green.
