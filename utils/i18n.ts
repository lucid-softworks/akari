import { ar } from "@/translations/ar";
import { de } from "@/translations/de";
import { en } from "@/translations/en";
import { enUS } from "@/translations/en-US";
import { es } from "@/translations/es";
import { fr } from "@/translations/fr";
import { hi } from "@/translations/hi";
import { id } from "@/translations/id";
import { it } from "@/translations/it";
import { ja } from "@/translations/ja";
import { ko } from "@/translations/ko";
import { nl } from "@/translations/nl";
import { pl } from "@/translations/pl";
import { pt } from "@/translations/pt";
import { ru } from "@/translations/ru";
import { th } from "@/translations/th";
import { tr } from "@/translations/tr";
import { vi } from "@/translations/vi";
import { zhCN } from "@/translations/zh-CN";
import { zhTW } from "@/translations/zh-TW";
import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import { translationLogger } from "./translationLogger";

// Translation keys for the app
const translations = {
  en,
  ja,
  ar,
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
export const getAvailableLocales = () => Object.keys(translations);

// Type for translation keys
export type TranslationKey = keyof typeof translations.en;
