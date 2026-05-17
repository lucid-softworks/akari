import { getAvailableLocales, setLocale } from "@/utils/i18n";
import { getLocales } from "expo-localization";
import React, { createContext, use, useCallback, useMemo, useState } from "react";
import { MMKV } from "react-native-mmkv";

type LanguageContextType = {
  currentLocale: string;
  changeLanguage: (locale: string) => void;
  availableLocales: string[];
};

type LanguageProviderProps = {
  children: React.ReactNode;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

// Storage for language preference
const storage = new MMKV();
const LANGUAGE_KEY = "app_language";

/**
 * Resolve the initial locale synchronously so the provider renders with
 * the right language on first paint. We previously did this in a
 * useEffect after mount, which both flashed English for a tick and
 * cascaded a second render via setCurrentLocale.
 */
const resolveInitialLocale = (availableLocales: string[]): string => {
  const savedLanguage = storage.getString(LANGUAGE_KEY);
  if (savedLanguage && availableLocales.includes(savedLanguage)) {
    setLocale(savedLanguage);
    return savedLanguage;
  }
  const deviceLanguage = getLocales()[0]?.languageCode;
  const language = availableLocales.includes(deviceLanguage || "")
    ? deviceLanguage || "en"
    : "en";
  setLocale(language);
  storage.set(LANGUAGE_KEY, language);
  return language;
};

export const LanguageProvider = ({
  children,
}: LanguageProviderProps) => {
  const availableLocales = getAvailableLocales();
  const [currentLocale, setCurrentLocale] = useState<string>(() =>
    resolveInitialLocale(availableLocales),
  );

  const changeLanguage = useCallback((locale: string) => {
    if (availableLocales.includes(locale)) {
      setCurrentLocale(locale);
      setLocale(locale);
      storage.set(LANGUAGE_KEY, locale);
    }
  }, [availableLocales]);

  const value = useMemo(
    () => ({ currentLocale, changeLanguage, availableLocales }),
    [currentLocale, changeLanguage, availableLocales],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = use(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
