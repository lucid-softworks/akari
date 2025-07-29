import { useLanguage } from "@/contexts/LanguageContext";
import en from "@/translations/en.json";
import i18n from "@/utils/i18n";
import { TranslateOptions } from "i18n-js";
import { useCallback } from "react";

// Utility type to generate dot notation paths for nested objects
type DotNotation<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? `${string & K}.${DotNotation<T[K]>}`
        : `${string & K}`;
    }[keyof T]
  : never;

// Type for all possible translation keys in dot notation
type TranslationKey = DotNotation<(typeof en)["translations"]>;

export const useTranslation = () => {
  const { currentLocale, changeLanguage, availableLocales } = useLanguage();

  const t = useCallback((key: TranslationKey, options?: TranslateOptions) => {
    return i18n.t(key, options);
  }, []);

  return {
    t,
    changeLanguage,
    currentLocale,
    availableLocales,
    locale: currentLocale,
  };
};

export default useTranslation;
