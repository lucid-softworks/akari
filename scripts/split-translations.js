#!/usr/bin/env node
/* eslint-disable */
/**
 * One-off migration script: converts the flat
 *   translations/<locale>.json   (one fat file per locale)
 * layout into
 *   translations/<locale>/<section>.json   (one file per top-level section)
 *   translations/<locale>/index.ts         (barrel re-export)
 *   translations/_meta.json                (global { language, nativeName, flag } per locale)
 *
 * Run from anywhere: `node scripts/split-translations.js`
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TRANSLATIONS_DIR = path.join(ROOT, 'apps/akari/translations');

const files = fs
  .readdirSync(TRANSLATIONS_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));

const meta = {};

for (const locale of files) {
  const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  meta[locale] = {
    language: data.language,
    nativeName: data.nativeName,
    flag: data.flag,
  };

  const localeDir = path.join(TRANSLATIONS_DIR, locale);
  if (!fs.existsSync(localeDir)) fs.mkdirSync(localeDir);

  const sections = Object.keys(data.translations).sort();
  const importLines = sections.map((s) => `import ${s} from './${s}.json';`);
  const exportEntries = sections.map((s) => `  ${s},`);

  for (const section of sections) {
    const sectionPath = path.join(localeDir, `${section}.json`);
    fs.writeFileSync(
      sectionPath,
      JSON.stringify(data.translations[section], null, 2) + '\n',
    );
  }

  const indexPath = path.join(localeDir, 'index.ts');
  const indexContent = [
    ...importLines,
    '',
    'export const translations = {',
    ...exportEntries,
    '};',
    '',
    'export default translations;',
    '',
  ].join('\n');
  fs.writeFileSync(indexPath, indexContent);

  fs.unlinkSync(filePath);
}

fs.writeFileSync(
  path.join(TRANSLATIONS_DIR, '_meta.json'),
  JSON.stringify(meta, null, 2) + '\n',
);

console.log(`Split ${files.length} locale files into per-section structure.`);
