import fs from 'node:fs';
import path from 'node:path';

/**
 * Custom oxlint plugin: validates that every locale under `translations/`
 * carries exactly the same key set as the English reference (`translations/en`).
 *
 * Translation key parity is a whole-corpus invariant, not a per-file concern,
 * so the rule keys off a single anchor file — the `en` barrel
 * (`translations/en/index.ts`) — and, when linting that file, reads every
 * sibling locale directory off disk and reports any drift. On all other files
 * it is a no-op.
 *
 * Replaces the standalone `scripts/validate-translations.js`.
 */

/** Recursively collect dotted key paths from a nested object. */
function getAllKeys(object, prefix = '') {
  const keys = [];
  for (const key in object) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);
    const value = object[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    }
  }
  return keys;
}

/**
 * Merge a locale directory's per-namespace JSON files into one object keyed by
 * file basename — the same shape the locale's index.ts barrel exports.
 */
function loadLocale(localeDir) {
  const merged = {};
  for (const file of fs.readdirSync(localeDir).filter((f) => f.endsWith('.json')).toSorted()) {
    merged[path.basename(file, '.json')] = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8'));
  }
  return merged;
}

const PREVIEW = 10;

function summarize(label, keys) {
  if (keys.length === 0) return '';
  const shown = keys.slice(0, PREVIEW).join(', ');
  return `${label} ${keys.length} (${shown}${keys.length > PREVIEW ? ', …' : ''})`;
}

const translationKeyParity = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Every locale must carry the same translation keys as the English reference.',
    },
  },
  create(context) {
    return {
      Program(node) {
        const filename = context.filename.replace(/\\/g, '/');
        // Only run once, anchored on the English barrel.
        if (!filename.endsWith('/translations/en/index.ts')) return;

        const enDir = path.dirname(context.filename);
        const translationsDir = path.dirname(enDir);

        let referenceKeys;
        try {
          referenceKeys = new Set(getAllKeys(loadLocale(enDir)));
        } catch (error) {
          context.report({ message: `Failed to load en reference translations: ${error.message}`, node });
          return;
        }

        const locales = fs
          .readdirSync(translationsDir, { withFileTypes: true })
          .flatMap((entry) => (entry.isDirectory() && entry.name !== 'en' ? [entry.name] : []))
          .toSorted();

        for (const locale of locales) {
          let localeKeys;
          try {
            localeKeys = new Set(getAllKeys(loadLocale(path.join(translationsDir, locale))));
          } catch (error) {
            context.report({ message: `Locale "${locale}" failed to parse: ${error.message}`, node });
            continue;
          }

          const missing = [...referenceKeys].filter((key) => !localeKeys.has(key));
          const extra = [...localeKeys].filter((key) => !referenceKeys.has(key));
          if (missing.length === 0 && extra.length === 0) continue;

          const detail = [summarize('missing', missing), summarize('extra', extra)]
            .filter(Boolean)
            .join('; ');
          context.report({
            message: `Locale "${locale}" is out of sync with en — ${detail}`,
            node,
          });
        }
      },
    };
  },
};

export default {
  meta: { name: 'akari' },
  rules: { 'translation-key-parity': translationKeyParity },
};
