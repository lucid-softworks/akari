import { useLanguage } from "@/contexts/LanguageContext";
import i18n from "@/utils/i18n";
import { useCallback } from "react";

export const useTranslation = () => {
  const { currentLocale, changeLanguage, availableLocales } = useLanguage();

  const t = useCallback((key: string, options?: Record<string, unknown>) => {
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
