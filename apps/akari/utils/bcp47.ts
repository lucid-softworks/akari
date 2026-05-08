/**
 * Minimal BCP-47 language helpers built on `Intl.DisplayNames` (the standard
 * platform API), so we don't have to ship and maintain a static list of
 * languages. The picker shown in the post composer uses this; the saved
 * value is the bare BCP-47 tag (e.g. 'en', 'es', 'pt-BR').
 *
 * Defaults to a curated short list of common posting languages — anything
 * else can be filtered by display name in the picker.
 */

const COMMON_LANGUAGES = [
  'en',
  'es',
  'pt',
  'pt-BR',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
  'zh',
  'zh-Hans',
  'zh-Hant',
  'ru',
  'uk',
  'pl',
  'nl',
  'tr',
  'ar',
  'hi',
  'id',
  'vi',
  'th',
  'sv',
  'da',
  'no',
  'fi',
  'cs',
  'hu',
  'el',
  'he',
  'ro',
  'bg',
  'sk',
  'sl',
  'cy',
  'fa',
  'az',
  'bn',
  'ta',
  'ms',
  'tl',
] as const;

export type LanguageOption = {
  /** BCP-47 tag, e.g. `'en'` or `'pt-BR'`. */
  tag: string;
  /** Localized display name in the user's UI locale, e.g. "English", "Português (Brasil)". */
  label: string;
  /** Native display name (optional), e.g. "Português (Brasil)" regardless of UI locale. */
  nativeLabel?: string;
};

let displayNamesCache: Map<string, Intl.DisplayNames | null> | null = null;

function getDisplayNames(uiLocale: string): Intl.DisplayNames | null {
  if (!displayNamesCache) displayNamesCache = new Map();
  if (displayNamesCache.has(uiLocale)) return displayNamesCache.get(uiLocale) ?? null;
  try {
    const dn = new Intl.DisplayNames([uiLocale], { type: 'language' });
    displayNamesCache.set(uiLocale, dn);
    return dn;
  } catch {
    displayNamesCache.set(uiLocale, null);
    return null;
  }
}

export function getLanguageLabel(tag: string, uiLocale: string): string {
  const dn = getDisplayNames(uiLocale);
  if (!dn) return tag;
  try {
    return dn.of(tag) ?? tag;
  } catch {
    return tag;
  }
}

function getNativeLanguageLabel(tag: string): string {
  const dn = getDisplayNames(tag);
  if (!dn) return tag;
  try {
    return dn.of(tag) ?? tag;
  } catch {
    return tag;
  }
}

/**
 * Build the picker option list. Includes the common-languages set plus any
 * extra tags (e.g. the user's currently-selected tag if it isn't in the
 * common set). De-duplicated and sorted by localized label.
 */
export function buildLanguageOptions(uiLocale: string, extras: string[] = []): LanguageOption[] {
  const tags = Array.from(new Set([...COMMON_LANGUAGES, ...extras]));
  return tags
    .map((tag) => ({
      tag,
      label: getLanguageLabel(tag, uiLocale),
      nativeLabel: getNativeLanguageLabel(tag),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, uiLocale));
}
