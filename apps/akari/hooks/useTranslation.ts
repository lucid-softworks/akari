import { useLanguage } from "@/contexts/LanguageContext";
import en from "@/translations/en";
import i18n from "@/utils/i18n";
import { useCallback } from "react";

// Utility type to generate dot notation paths for nested objects
type DotNotation<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? `${string & K}.${DotNotation<T[K]>}`
        : `${string & K}`;
    }[keyof T]
  : never;

// Type for all possible translation keys in dot notation. `en` is the
// per-locale barrel — `{ auth: {…}, post: {…}, … }` — so dot-notation
// against it produces `auth.signupEmail`, `post.postedToast`, etc.
type TranslationKey = DotNotation<typeof en>;

export const useTranslation = () => {
  const { currentLocale, changeLanguage, availableLocales } = useLanguage();

  const t = useCallback(
    (
      key: TranslationKey,
      options?: Record<string, string | number | undefined>
    ) => {
      return i18n.t(key, options);
    },
    []
  );

  return {
    t,
    changeLanguage,
    currentLocale,
    availableLocales,
    locale: currentLocale,
  };
};

export default useTranslation;
