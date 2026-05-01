# akari

a bluesky client built with expo + react native. ios, android, and web.

> protocol: [at protocol](https://atproto.com).

## structure

```
.
├── apps/akari/   ← the app (expo, react native, react native web)
├── packages/     ← shared api clients (bluesky, clearsky)
├── scripts/      ← translation tooling, coverage merging
└── patches/      ← patch-package overrides
```

## quick

```sh
npm install
npm run start:development     # metro
npm run ios:development       # native ios
npm run web:development       # web
```

build variants: `development`, `preview`, `production`. each gets its own bundle id so they install side-by-side. set `APP_VARIANT` or use the variant-specific scripts (`*:preview`, `*:production`).

## scripts

```
npm run dev                       # turbo dev across workspace
npm run lint                      # turbo lint
npm run test                      # jest in apps/akari
npm run test:coverage             # + merged coverage
npm run validate-translations     # i18n key validation
npm run find-unused-translations  # dead-string detection
```

## docs

- [`apps/akari/README.md`](./apps/akari/README.md) — app-level setup
- [`AGENTS.md`](./AGENTS.md) — per-directory contribution rules
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — pr workflow
- [`CHANGELOG.md`](./CHANGELOG.md) — release-please managed
- [`SECURITY.md`](./SECURITY.md) — vulnerability reporting

## license

mit. see [`LICENSE`](./LICENSE).
