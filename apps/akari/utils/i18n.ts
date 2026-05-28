import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";

import meta from "@/translations/_meta.json";
import ar from "@/translations/ar";
import az from "@/translations/az";
import bg from "@/translations/bg";
import cs from "@/translations/cs";
import cy from "@/translations/cy";
import da from "@/translations/da";
import de from "@/translations/de";
import el from "@/translations/el";
import enUS from "@/translations/en-US";
import en from "@/translations/en";
import es from "@/translations/es";
import fa from "@/translations/fa";
import fi from "@/translations/fi";
import fr from "@/translations/fr";
import he from "@/translations/he";
import hi from "@/translations/hi";
import hu from "@/translations/hu";
import id from "@/translations/id";
import it from "@/translations/it";
import ja from "@/translations/ja";
import ko from "@/translations/ko";
import nl from "@/translations/nl";
import pl from "@/translations/pl";
import pt from "@/translations/pt";
import ro from "@/translations/ro";
import ru from "@/translations/ru";
import sk from "@/translations/sk";
import sl from "@/translations/sl";
import sv from "@/translations/sv";
import th from "@/translations/th";
import tr from "@/translations/tr";
import uk from "@/translations/uk";
import vi from "@/translations/vi";
import zh from "@/translations/zh";
import zhCN from "@/translations/zh-CN";
import zhTW from "@/translations/zh-TW";

import { pseudoLocalizeObject } from "./pseudoLocalization";
import { translationLogger } from "./translationLogger";

// Each locale barrel exports the merged `{ section: { …keys } }` shape.
// Metadata (language name + native name + flag) lives in the global
// `_meta.json` so per-locale dirs only contain translation strings.
const sectionsByLocale = {
  en,
  ja,
  ar,
  az,
  bg,
  cs,
  cy,
  da,
  de,
  el,
  es,
  fa,
  fi,
  fr,
  he,
  hi,
  hu,
  id,
  it,
  ko,
  nl,
  pl,
  pt,
  ro,
  ru,
  sk,
  sl,
  sv,
  th,
  tr,
  uk,
  vi,
  zh,
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
};

// Pseudo locale is generated from English at boot — handy for catching
// strings that aren't routed through `useTranslation` (they show up
// untransformed in the UI).
const sectionsWithPseudo = {
  ...sectionsByLocale,
  pseudo: pseudoLocalizeObject(en),
};

const metaWithPseudo = {
  ...meta,
  pseudo: { language: "Pseudo", nativeName: "Pseudo", flag: "🔤" },
};

const i18n = new I18n(sectionsWithPseudo);

const deviceLanguage = getLocales()[0].languageCode;
i18n.locale = deviceLanguage ?? "en";

i18n.enableFallback = true;
i18n.defaultLocale = "en";

// Log missing keys so we notice when a screen reaches for a string that
// doesn't exist in the current locale.
const originalTranslate = i18n.t.bind(i18n);
i18n.t = (
  scope: Parameters<typeof originalTranslate>[0],
  options?: Parameters<typeof originalTranslate>[1]
) => {
  const result = originalTranslate(scope, options);
  if (typeof scope === "string" && result === scope) {
    translationLogger.logMissing(scope, i18n.locale);
  } else if (typeof scope === "string") {
    translationLogger.logUsage(scope, i18n.locale);
  }
  return result;
};

export default i18n;

export const getCurrentLocale = () => i18n.locale;

export const setLocale = (locale: string) => {
  i18n.locale = locale;
};

export const getAvailableLocales = () => Object.keys(sectionsWithPseudo);

/**
 * Returns the `{ language, nativeName, flag, translations }` bundle a
 * caller used to get from the flat locale file. Kept in this shape for
 * backwards compatibility with the language-picker screens.
 */
export const getTranslationData = (locale: string) => {
  const sections = sectionsWithPseudo[locale as keyof typeof sectionsWithPseudo];
  const m = metaWithPseudo[locale as keyof typeof metaWithPseudo];
  if (!sections || !m) return undefined;
  return { ...m, translations: sections };
};
