# Akari Codebase Evaluation

**Date:** 2026-04-02
**Version evaluated:** 1.4.1 (commit b9581f0)

---

## Overview

Akari is a multi-platform Bluesky (ATProto) client built with React Native, Expo, and TypeScript. It targets iOS, Android, and Web from a single codebase organized as a Turbo monorepo. The project is production-grade with 841+ commits, 36+ supported languages, and a full CI/CD pipeline.

Overall, the codebase is well-structured and functional. The observations below focus on what could be tightened, not what's broken.

---

## Strengths

### Architecture
- **Monorepo done right.** Clean separation between the main app (`apps/akari`), backend services (`activity-service`, `firehose-notifier`, `notifier-registry`), and shared packages (`bluesky-api`, `tenor-api`, etc.). Turbo orchestrates it all.
- **React Query is used excellently.** Optimistic updates on likes/reposts/follows, 24-hour cache persistence to MMKV, proper `onMutate`/`onError`/`onSettled` rollback patterns. This is the strongest part of the codebase.
- **File-based routing via Expo Router** keeps navigation declarative and reduces boilerplate.
- **Secure storage** with platform-aware MMKV encryption (disabled on web, 256-bit key on native).

### Internationalization
- 36+ languages with a solid pipeline: `i18n-js` + `useTranslation` hook + MMKV persistence + device locale auto-detection.
- CI validation workflow catches translation regressions on PRs.
- Utility scripts for finding unused keys and syncing translations.
- Pseudo-localization support for catching text overflow issues early.

### CI/CD
- Comprehensive GitHub Actions: lint, test with coverage, preview builds, production release (iOS/Android/Web), docs deployment, translation validation.
- Fork protection via `safe-to-run-ci` label.
- EAS-based native builds with separate dev/preview/production variants.

### Developer Experience
- Strong TypeScript throughout with few escape hatches.
- Consistent hook naming conventions (`use*`).
- Platform-specific files (`.ios.tsx`, `.web.tsx`) where behavior genuinely diverges.
- Component error boundaries with dev-mode details.

---

## Issues

### Critical: Component bloat

| File | Lines | Problem |
|------|-------|---------|
| `PostCard.tsx` | 1,708 | Handles post rendering, embeds, interactions, reply threading, repost display, and content warnings in a single file. |
| `Sidebar.tsx` | 661 | Mixes navigation, account switching, theme controls, and profile display. |
| `ProfileHeader.tsx` | 567 | Combines header layout, follow actions, mute/block logic, and stats display. |

These files are doing too much. `PostCard` in particular is a maintenance hazard -- any change to embed rendering risks breaking interaction handlers, and vice versa.

**Recommendation:** Extract sub-components: `PostEmbeds`, `PostActions`, `PostHeader`, `RepostIndicator`, `ContentWarning`. Each should own its own styles and logic. The parent `PostCard` becomes a composition shell.

### High: Mutation hook duplication

The mutation hooks (`useLikePost`, `useRepostPost`, `useCreatePost`, `useFollowUser`, etc.) share a near-identical structure:

1. Cancel related queries
2. Snapshot previous data
3. Optimistically update cache
4. On error, rollback to snapshot
5. On success, invalidate queries

This pattern is copy-pasted ~20 times with minor variations. Each copy is a place where a bug fix might not be applied consistently.

**Recommendation:** Extract a shared `useOptimisticMutation` helper that accepts a config object (query keys to cancel, cache update function, rollback function). Individual hooks become thin wrappers.

### High: TypeScript escape hatches

Several `@ts-expect-error` comments in navigation utilities (`useNavigateToPost`, `useNavigateToProfile`) suggest the type definitions for Expo Router params are incomplete or mismatched. There are also scattered `as any` casts in API response handling.

**Recommendation:** Define a central `RootParamList` type that covers all routes and their params. This eliminates the need for suppressions and catches param mismatches at compile time.

### Medium: Hardcoded encryption key

`secureStorage.ts` contains a hardcoded encryption key for development. While the README warns about production setup, this is the kind of thing that ships by accident.

**Recommendation:** Pull the key from an environment variable even in development. Use `expo-constants` to inject it from `app.config.ts` so there's never a secret in source.

### Medium: Inline styles

Many components define styles inline or at the bottom of large files rather than in co-located style modules. This makes it hard to identify shared visual patterns and creates inconsistency between components that look the same but are styled differently.

**Recommendation:** For components that share visual patterns (cards, headers, action rows), extract shared style constants into a `styles/` directory or a design token system.

### Medium: Missing error type differentiation

Mutations surface errors as generic toast messages. A network timeout, an expired token, and a rate limit all look the same to the user. The `BlueskyApi` package doesn't distinguish error types.

**Recommendation:** Add an error classification layer in the API client (`NetworkError`, `AuthError`, `RateLimitError`, `ValidationError`). Mutation hooks can then show contextual messages and take appropriate recovery actions (e.g., re-auth on `AuthError`).

### Low: Translation bundle size

All 36 translation files are bundled into every build. For less common languages, this is dead weight.

**Recommendation:** Lazy-load translation files based on the user's selected language. Only bundle English as the fallback.

### Low: Test coverage visibility

The test infrastructure is solid (Jest + RNTL + MSW), but there's no enforced coverage threshold and coverage reports aren't surfaced in PRs in a way that tracks trends over time.

**Recommendation:** Add a coverage threshold to `jest.config.js` (e.g., 60% to start) and integrate a coverage trend tracker into the CI pipeline.

---

## Architecture Diagram

```
apps/akari/
  app/          <- Expo Router (file-based routes)
    (tabs)/     <- Tab navigator (home, search, notifications, messages, profile, settings)
    (auth)/     <- Auth flow
  components/   <- UI components (72 files)
  hooks/
    queries/    <- React Query hooks (36) -- read operations
    mutations/  <- Mutation hooks (20) -- write operations with optimistic updates
  contexts/     <- ToastContext, LanguageContext, DialogContext
  utils/        <- i18n, storage, navigation, notifications
  translations/ <- 36+ JSON language files

packages/
  bluesky-api/          <- ATProto client (auth, feeds, actors, search, DMs, notifications)
  clearsky-api/         <- ClearSky directory integration
  libretranslate-api/   <- Translation service
  tenor-api/            <- GIF search
  constellation-api/    <- Constellation integration
  microcosm-links-api/  <- Link resolution
  axiom-crash-reporter/ <- Error reporting
```

---

## Summary

| Area | Rating | Notes |
|------|--------|-------|
| Architecture | Strong | Clean monorepo, good separation of concerns |
| State management | Strong | React Query used to its full potential |
| TypeScript | Good | Solid coverage with some escape hatches to clean up |
| i18n | Strong | 36+ languages, CI validation, dev tooling |
| Component design | Needs work | Several oversized components need decomposition |
| Code reuse | Needs work | Mutation hooks have significant duplication |
| Testing | Adequate | Good setup, needs coverage enforcement |
| CI/CD | Strong | Multi-platform builds, automated releases |
| Security | Good | Encrypted storage, but hardcoded dev key is a risk |
| Error handling | Adequate | Error boundaries exist, but error types are too generic |

The foundation is solid. The highest-impact improvements would be decomposing `PostCard.tsx` and extracting the shared mutation pattern -- these two changes alone would significantly improve maintainability.
