#!/usr/bin/env node
/**
 * Generates `public/.well-known/oauth-client*.json` for the active build
 * variant. We ship two metadata docs per origin — one for native (custom-
 * scheme redirect) and one for web (HTTPS redirect) — because OAuth
 * doesn't allow mixing those redirect styles inside a single client.
 *
 *   APP_VARIANT=production → akari.lucidsoft.works   (default)
 *   APP_VARIANT=preview    → preview.akari.lucidsoft.works
 *
 * The `scope` field is recomputed from `scripts/lib/oauth-scope-data.js`
 * on every run, so the registered scope string the auth server checks
 * against always matches whatever the picker / signIn code might ask
 * for. Run automatically by the `deploy*` scripts; safe to re-run by
 * hand.
 */

const fs = require('node:fs');
const path = require('node:path');

const { buildFullScopeString } = require('./lib/oauth-scope-data');

const variant = (process.env.APP_VARIANT ?? 'production').toLowerCase();
const allowedVariants = new Set(['production', 'preview']);
if (!allowedVariants.has(variant)) {
  console.error(
    `[sync-oauth-meta] Unsupported APP_VARIANT=${variant}. Use 'production' or 'preview'.`,
  );
  process.exit(1);
}

const root = path.join(__dirname, '..');
const sources = path.join(root, 'oauth-clients');
const target = path.join(root, 'public', '.well-known');
fs.mkdirSync(target, { recursive: true });

const fullScope = buildFullScopeString();

const pairs = [
  {
    source: `oauth-client.${variant}.json`,
    output: 'oauth-client.json',
  },
  {
    source: `oauth-client-web.${variant}.json`,
    output: 'oauth-client-web.json',
  },
];

for (const { source, output } of pairs) {
  const sourcePath = path.join(sources, source);
  const targetPath = path.join(target, output);
  if (!fs.existsSync(sourcePath)) {
    console.error(`[sync-oauth-meta] Missing template: ${sourcePath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const doc = JSON.parse(raw);
  // Inject the freshly-computed scope so the registered metadata always
  // matches what the picker can ask for.
  doc.scope = fullScope;
  fs.writeFileSync(targetPath, JSON.stringify(doc, null, 2) + '\n');
  console.log(`[sync-oauth-meta] ${source} → public/.well-known/${output}`);
}
