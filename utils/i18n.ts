import ar from "@/translations/ar.json";
import cy from "@/translations/cy.json";
import de from "@/translations/de.json";
import enUS from "@/translations/en-US.json";
import en from "@/translations/en.json";
import es from "@/translations/es.json";
import fr from "@/translations/fr.json";
import hi from "@/translations/hi.json";
import id from "@/translations/id.json";
import it from "@/translations/it.json";
import ja from "@/translations/ja.json";
import ko from "@/translations/ko.json";
import nl from "@/translations/nl.json";
import pl from "@/translations/pl.json";
import pt from "@/translations/pt.json";
import ru from "@/translations/ru.json";
import th from "@/translations/th.json";
import tr from "@/translations/tr.json";
import vi from "@/translations/vi.json";
import zhCN from "@/translations/zh-CN.json";
import zhTW from "@/translations/zh-TW.json";
import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import { pseudoLocalizeObject } from "./pseudoLocalization";
import { translationLogger } from "./translationLogger";

// Raw translation data (includes metadata and nested translations)
const rawTranslations = {
  en,
  ja,
  ar,
  cy,
  fr,
  es,
  de,
  pt,
  it,
  ko,
  ru,
  hi,
  id,
  tr,
  nl,
  pl,
  vi,
  th,
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
};

// Create pseudo translation data based on English
const createPseudoTranslations = () => ({
  language: "Pseudo",
  nativeName: "Pseudo",
  flag: "🔤",
  translations: pseudoLocalizeObject(rawTranslations.en.translations),
});

// Add pseudo translations to raw translations
const pseudoTranslations = createPseudoTranslations();
const rawTranslationsWithPseudo = {
  ...rawTranslations,
  pseudo: pseudoTranslations,
};

// Extract only the nested translations for the I18n constructor
const translations = Object.fromEntries(
  Object.entries(rawTranslationsWithPseudo).map(([locale, data]) => [
    locale,
    data.translations,
  ])
);

// Create i18n instance
const i18n = new I18n(translations);

// Set the locale based on device settings
const deviceLanguage = getLocales()[0].languageCode;
i18n.locale = deviceLanguage ?? "en";

// Enable fallback to English when a translation is missing
i18n.enableFallback = true;

// Set default locale
i18n.defaultLocale = "en";

// Add missing translation logging
const originalTranslate = i18n.t.bind(i18n);
i18n.t = (scope: any, options?: any) => {
  const result = originalTranslate(scope, options);

  // Check if the translation is missing (returns the key itself)
  if (typeof scope === "string" && result === scope) {
    translationLogger.logMissing(scope, i18n.locale);
  } else if (typeof scope === "string") {
    translationLogger.logUsage(scope, i18n.locale);
  }

  return result;
};

export default i18n;

// Helper function to get current locale
export const getCurrentLocale = () => i18n.locale;

// Helper function to set locale
export const setLocale = (locale: string) => {
  i18n.locale = locale;
};

// Helper function to get available locales
export const getAvailableLocales = () => Object.keys(rawTranslationsWithPseudo);

// Helper function to get translation data for a specific locale (includes metadata)
export const getTranslationData = (locale: string) => {
  return rawTranslationsWithPseudo[
    locale as keyof typeof rawTranslationsWithPseudo
  ];
};

// Type for translation keys
export type TranslationKey = keyof typeof translations.en;
