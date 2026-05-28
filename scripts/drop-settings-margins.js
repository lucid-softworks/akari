#!/usr/bin/env node
/* eslint-disable */
/**
 * Sweeps the settings screens to drop section-level `marginTop` styles.
 *
 * The new layout owns section spacing in two places:
 *   - `SettingsScroll` sets `gap: 32` on its content container so
 *     top-level children (sections, intros, save buttons) stack
 *     automatically.
 *   - `SettingsSection` sets `gap: 12` between its title and body.
 *
 * That makes the historical `marginTop: 12 | spacing.md | spacing.lg`
 * entries on `sectionCard`, intro text, helper text, and save buttons
 * redundant. Walk every file under app/(tabs)/settings/, strip those
 * lines, and leave inline micro-spacing (`marginTop: 2` / `4`) alone —
 * those belong to row internals where the new gap on `rowContent`
 * already covers them.
 *
 * Run from anywhere: `node scripts/drop-settings-margins.js`
 */

const fs = require('fs');
const path = require('path');

const SETTINGS_DIR = path.resolve(__dirname, '../apps/akari/app/(tabs)/settings');

// Section-spacing tokens we know we're removing. Anything smaller
// (spacing.xs, spacing.sm, raw 2/4) stays — those tend to be intra-row
// micro-spacing.
const TOKEN_RX =
  /\n\s*marginTop:\s*(?:spacing\.md|spacing\.lg|spacing\.xl|spacing\.xxl|12|16|20|24),?/g;

let touchedFiles = 0;
let droppedLines = 0;

function processFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const next = src.replace(TOKEN_RX, () => {
    droppedLines += 1;
    return '';
  });
  if (next !== src) {
    fs.writeFileSync(filePath, next);
    touchedFiles += 1;
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) processFile(p);
  }
}

walk(SETTINGS_DIR);

console.log(`Touched ${touchedFiles} files, dropped ${droppedLines} marginTop lines.`);
