import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SIDEBAR_PALETTE } from '@/constants/palette';
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
    if (
      translationData &&
      translationData.language &&
      translationData.nativeName &&
      translationData.flag
    ) {
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

const palette = SIDEBAR_PALETTE;

export const LanguageSelector = () => {
  const { t, currentLocale, changeLanguage } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const languages = getLanguages();
  const currentLanguage = languages.find((lang) => lang.code === currentLocale) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode);
    setIsModalVisible(false);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>{t('settings.language')}</ThemedText>

      <TouchableOpacity
        accessibilityLabel={t('settings.language')}
        accessibilityRole="button"
        style={styles.selector}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          <ThemedText style={styles.flag}>{currentLanguage.flag}</ThemedText>
          <View style={styles.selectorTextContainer}>
            <ThemedText style={styles.selectorText}>{currentLanguage.name}</ThemedText>
            <ThemedText style={styles.selectorNativeText}>{currentLanguage.nativeName}</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.chevron}>▼</ThemedText>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity
          accessibilityLabel={t('common.cancel')}
          accessibilityRole="button"
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <ThemedView
            accessible
            accessibilityRole="menu"
            accessibilityLabel={t('settings.language')}
            style={styles.modalContent}
          >
            <ThemedText style={styles.modalTitle}>{t('settings.language')}</ThemedText>
            <ScrollView style={styles.languageList}>
              {languages.map((language) => {
                const selected = currentLocale === language.code;
                return (
                  <TouchableOpacity
                    key={language.code}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected }}
                    style={[styles.languageOption, selected && styles.selectedLanguage]}
                    onPress={() => handleLanguageChange(language.code)}
                  >
                    <View style={styles.languageInfo}>
                      <ThemedText style={styles.flag}>{language.flag}</ThemedText>
                      <View style={styles.languageTextContainer}>
                        <ThemedText style={styles.languageName}>{language.nativeName}</ThemedText>
                        <ThemedText style={styles.languageEnglishName}>{language.name}</ThemedText>
                      </View>
                    </View>
                    {selected ? (
                      <View style={styles.checkmark}>
                        <ThemedText style={styles.checkmarkText}>✓</ThemedText>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </ThemedView>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: palette.textMuted,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.activeBackground,
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
    marginRight: 12,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  selectorNativeText: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 12,
    color: palette.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '82%',
    maxHeight: '72%',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.headerBackground,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: palette.textPrimary,
  },
  languageList: {
    maxHeight: 320,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.background,
  },
  selectedLanguage: {
    backgroundColor: palette.activeBackground,
    borderColor: palette.highlight,
  },
  languageInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.textPrimary,
  },
  languageEnglishName: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: palette.background,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default LanguageSelector;
