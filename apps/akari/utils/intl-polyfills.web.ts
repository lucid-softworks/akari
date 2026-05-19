/**
 * Web doesn't need any of the FormatJS polyfills the native build pulls
 * in — modern browsers ship a full `Intl` (canonical-locales, Locale,
 * NumberFormat with `notation: 'compact'`, PluralRules,
 * RelativeTimeFormat, DisplayNames) natively.
 *
 * Loading them on web also breaks the Metro web bundler: FormatJS's
 * `lib/` ESM build uses extension-less relative imports
 * (e.g. `./PartitionNumberRangePattern`), which Metro's web resolver
 * doesn't auto-fill, surfacing as:
 *
 *   Unable to resolve module ./PartitionNumberRangePattern from
 *   .../@formatjs/ecma402-abstract/lib/NumberFormat/FormatNumericRange.js
 *
 * Metro picks `.web.ts` over the platform-agnostic `.ts` file when
 * bundling for web, so this empty module short-circuits the imports
 * entirely. The native build (`intl-polyfills.ts`) still loads
 * FormatJS so Hermes gets its missing Intl features.
 */
export {};
