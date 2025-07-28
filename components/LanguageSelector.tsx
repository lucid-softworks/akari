import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTranslation } from "@/hooks/useTranslation";

type LanguageOption = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
};

const languages: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  {
    code: "en-US",
    name: "English (US)",
    nativeName: "English (Simplified)",
    flag: "🇺🇸",
  },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  {
    code: "zh-CN",
    name: "Chinese (Simplified)",
    nativeName: "简体中文",
    flag: "🇨🇳",
  },
  {
    code: "zh-TW",
    name: "Chinese (Traditional)",
    nativeName: "繁體中文",
    flag: "🇹🇼",
  },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
];

export const LanguageSelector: React.FC = () => {
  const { t, currentLocale, changeLanguage } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const currentLanguage =
    languages.find((lang) => lang.code === currentLocale) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode);
    setIsModalVisible(false);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>{t("settings.language")}</ThemedText>

      <TouchableOpacity
        style={styles.selector}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          <ThemedText style={styles.flag}>{currentLanguage.flag}</ThemedText>
          <View style={styles.selectorTextContainer}>
            <ThemedText style={styles.selectorText}>
              {currentLanguage.name}
            </ThemedText>
            <ThemedText style={styles.selectorNativeText}>
              {currentLanguage.nativeName}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={styles.chevron}>▼</ThemedText>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <ThemedView style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>
              {t("settings.language")}
            </ThemedText>
            <ScrollView style={styles.languageList}>
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
                    <ThemedText style={styles.flag}>{language.flag}</ThemedText>
                    <View style={styles.languageTextContainer}>
                      <ThemedText style={styles.languageName}>
                        {language.nativeName}
                      </ThemedText>
                      <ThemedText style={styles.languageEnglishName}>
                        {language.name}
                      </ThemedText>
                    </View>
                  </View>
                  {currentLocale === language.code && (
                    <View style={styles.checkmark}>
                      <ThemedText style={styles.checkmarkText}>✓</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedView>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectorTextContainer: {
    flex: 1,
  },
  flag: {
    fontSize: 20,
    marginRight: 8,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: "500",
  },
  selectorNativeText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  chevron: {
    fontSize: 12,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    maxHeight: "70%",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  languageList: {
    maxHeight: 300,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedLanguage: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  languageName: {
    fontSize: 16,
    fontWeight: "500",
  },
  languageInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  languageTextContainer: {
    flex: 1,
  },
  languageEnglishName: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default LanguageSelector;
