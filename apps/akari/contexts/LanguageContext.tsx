import { getAvailableLocales, setLocale } from "@/utils/i18n";
import { getLocales } from "expo-localization";
import React, { createContext, useContext, useEffect, useState } from "react";
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

export const LanguageProvider = ({
  children,
}: LanguageProviderProps) => {
  const [currentLocale, setCurrentLocale] = useState<string>("en");
  const availableLocales = getAvailableLocales();

  // Initialize language on app start
  useEffect(() => {
    const initializeLanguage = () => {
      // Try to get saved language preference
      const savedLanguage = storage.getString(LANGUAGE_KEY);

      if (savedLanguage && availableLocales.includes(savedLanguage)) {
        // Use saved language
        setCurrentLocale(savedLanguage);
        setLocale(savedLanguage);
      } else {
        // Use device language or fallback to English
        const deviceLanguage = getLocales()[0].languageCode;
        const language = availableLocales.includes(deviceLanguage || "")
          ? deviceLanguage || "en"
          : "en";

        setCurrentLocale(language);
        setLocale(language);

        // Save the language preference
        storage.set(LANGUAGE_KEY, language);
      }
    };

    initializeLanguage();
  }, [availableLocales]);

  const changeLanguage = (locale: string) => {
    if (availableLocales.includes(locale)) {
      setCurrentLocale(locale);
      setLocale(locale);
      storage.set(LANGUAGE_KEY, locale);
    }
  };

  return (
    <LanguageContext.Provider
      value={{ currentLocale, changeLanguage, availableLocales }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
