import React, { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useTranslation } from '@/hooks/useTranslation';
import { getAvailableLocales, getTranslationData } from '@/utils/i18n';

type LanguageOption = {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
};

// Helper function to get language metadata from translation files
const getLanguageMetadata = (locale: string): LanguageOption | null => {
  try {
    // Access the translation data using the helper function
    const translationData = getTranslationData(locale);
    if (translationData && translationData.language && translationData.nativeName && translationData.flag) {
      return {
        code: locale,
        name: translationData.language,
        nativeName: translationData.nativeName,
        flag: translationData.flag,
      };
    }
  } catch (error) {
    console.warn(`Failed to get metadata for locale: ${locale}`, error);
  }
  return null;
};

// Get all available languages with their metadata
const getLanguages = (): LanguageOption[] => {
  const availableLocales = getAvailableLocales();
  const languages: LanguageOption[] = [];

  availableLocales.forEach((locale) => {
    const metadata = getLanguageMetadata(locale);
    if (metadata) {
      languages.push(metadata);
    }
  });

  // Sort languages alphabetically by English name
  return languages.sort((a, b) => a.name.localeCompare(b.name));
};

export const LanguageSelector = () => {
  const { t, currentLocale, changeLanguage } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  // Android Modal `presentationStyle='fullScreen'` draws under the status
  // bar; iOS pageSheet auto-respects the safe area. Use `StatusBar.currentHeight`
  // — `useSafeAreaInsets` returns 0 inside a Modal (separate native window).
  const containerTopPadding = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

  const languages = getLanguages();
  const currentLanguage = languages.find((lang) => lang.code === currentLocale) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode);
    setIsModalVisible(false);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>{t('settings.language')}</ThemedText>

      <Pressable
        accessibilityLabel={t('settings.language')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.selector, pressed && { opacity: 0.7 }]}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          <ThemedText style={styles.flag}>{currentLanguage.flag}</ThemedText>
          <View style={styles.selectorTextContainer}>
            <ThemedText style={styles.selectorText}>{currentLanguage.name}</ThemedText>
            <ThemedText style={styles.selectorNativeText}>{currentLanguage.nativeName}</ThemedText>
          </View>
        </View>
        <IconSymbol name="chevron.down" size={12} color="rgba(0, 0, 0, 0.6)" />
      </Pressable>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={() => setIsModalVisible(false)}
      >
          <ThemedView
            accessible
            accessibilityRole="menu"
            accessibilityLabel={t('settings.language')}
            style={[styles.nativeSheet, { paddingTop: containerTopPadding }]}
          >
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setIsModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
                style={({ pressed }) => [styles.modalBackButton, pressed && { opacity: 0.7 }]}
                hitSlop={8}
              >
                <IconSymbol name="chevron.left" size={20} color="#007AFF" />
              </Pressable>
              <ThemedText style={styles.modalTitle}>{t('settings.language')}</ThemedText>
              <View style={styles.modalBackButton} />
            </View>
            <ScrollView style={styles.languageList} contentContainerStyle={styles.languageListContent}>
              {languages.map((language) => (
                <Pressable
                  key={language.code}
                  accessibilityRole="menuitem"
                  accessibilityState={{
                    selected: currentLocale === language.code,
                  }}
                  style={({ pressed }) => [styles.languageOption, currentLocale === language.code && styles.selectedLanguage, pressed && { opacity: 0.7 }]}
                  onPress={() => handleLanguageChange(language.code)}
                >
                  <View style={styles.languageInfo}>
                    <ThemedText style={styles.flag}>{language.flag}</ThemedText>
                    <View style={styles.languageTextContainer}>
                      <ThemedText style={styles.languageName}>{language.nativeName}</ThemedText>
                      <ThemedText style={styles.languageEnglishName}>{language.name}</ThemedText>
                    </View>
                  </View>
                  {currentLocale === language.code && (
                    <View style={styles.checkmark}>
                      <IconSymbol name="checkmark.circle.fill" size={12} color="white" />
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </ThemedView>
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
    fontWeight: '600',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '500',
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
  nativeSheet: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalBackButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  languageList: {
    flex: 1,
  },
  languageListContent: {
    padding: 16,
    paddingTop: 0,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedLanguage: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
  },
  languageInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
