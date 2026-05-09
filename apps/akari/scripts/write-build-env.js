#!/usr/bin/env node
/**
 * Runs as `eas-build-pre-install` during EAS Build. Copies the EAS-provided
 * git commit hash into `.env.local` so `app.config.ts` can pick it up via
 * `process.env.EXPO_PUBLIC_COMMIT_SHA` and embed it in the bundle. From
 * there `<BuildWatermark>` shows it on TestFlight screenshots so we know
 * which build a tester was on when they report something.
 *
 * No-op locally: when EAS_BUILD_GIT_COMMIT_HASH is unset (e.g. running
 * `expo run:ios` on your laptop) we leave the existing `.env.local` alone.
 */

const fs = require('node:fs');
const path = require('node:path');

const commitHash = process.env.EAS_BUILD_GIT_COMMIT_HASH;
if (!commitHash) {
  console.log('[write-build-env] No EAS_BUILD_GIT_COMMIT_HASH set; skipping.');
  process.exit(0);
}

const envPath = path.join(__dirname, '..', '.env.local');
const line = `EXPO_PUBLIC_COMMIT_SHA=${commitHash}`;

let next = line + '\n';
if (fs.existsSync(envPath)) {
  const current = fs.readFileSync(envPath, 'utf8');
  // Strip any prior EXPO_PUBLIC_COMMIT_SHA= line so we don't accumulate
  // stale values across re-runs (EAS Build caches sometimes do).
  const filtered = current
    .split(/\r?\n/)
    .filter((l) => !l.startsWith('EXPO_PUBLIC_COMMIT_SHA='))
    .join('\n')
    .replace(/\n+$/, '');
  next = (filtered.length > 0 ? filtered + '\n' : '') + line + '\n';
}

fs.writeFileSync(envPath, next);
console.log(`[write-build-env] Wrote EXPO_PUBLIC_COMMIT_SHA=${commitHash.slice(0, 7)} to .env.local`);
