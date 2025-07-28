import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTranslation } from "@/hooks/useTranslation";

type LanguageOption = {
  code: string;
  name: string;
  nativeName: string;
};

const languages: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "fr", name: "French", nativeName: "Français" },
];

export const LanguageSelector: React.FC = () => {
  const { t, currentLocale, changeLanguage } = useTranslation();

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>{t("settings.language")}</ThemedText>
      {languages.map((language) => (
        <TouchableOpacity
          key={language.code}
          style={[
            styles.languageOption,
            currentLocale === language.code && styles.selectedLanguage,
          ]}
          onPress={() => handleLanguageChange(language.code)}
        >
          <View style={styles.languageInfo}>
            <ThemedText style={styles.languageName}>
              {language.nativeName}
            </ThemedText>
            {language.name !== language.nativeName && (
              <ThemedText style={styles.languageNameSecondary}>
                {language.name}
              </ThemedText>
            )}
          </View>
          {currentLocale === language.code && (
            <View style={styles.checkmark}>
              <ThemedText style={styles.checkmarkText}>✓</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedLanguage: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: "500",
  },
  languageNameSecondary: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default LanguageSelector;
