import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { usePostTranslation } from '@/hooks/mutations/usePostTranslation';
import { useLibreTranslateLanguages } from '@/hooks/queries/useLibreTranslateLanguages';
import { spacing, fontSize, fontWeight, opacity, activeOpacity, semanticColors, layout } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { DEFAULT_LIBRETRANSLATE_LANGUAGES, type LibreTranslateLanguage } from '@/utils/libretranslate';

const LANGUAGE_CODE_ALIASES: Record<string, string> = {
  'zh-cn': 'zh',
  'zh-hans': 'zh',
  'zh-sg': 'zh',
  'zh-hk': 'zh',
  'zh-tw': 'zh',
  'zh-hant': 'zh',
  'pt-br': 'pt',
  'pt-pt': 'pt',
  'en-us': 'en',
  'en-gb': 'en',
  'en-au': 'en',
  'en-ca': 'en',
  'es-mx': 'es',
  'es-es': 'es',
};

const normalizeLanguageCode = (code: string) => {
  const lower = code.toLowerCase();
  if (LANGUAGE_CODE_ALIASES[lower]) return LANGUAGE_CODE_ALIASES[lower];
  if (lower.includes('-')) {
    const [base] = lower.split('-');
    return LANGUAGE_CODE_ALIASES[base] ?? base;
  }
  return lower;
};

const resolveLanguageCode = (locale: string | undefined, languages: LibreTranslateLanguage[]) => {
  const fallback = languages.find((l) => l.code === 'en')?.code || languages[0]?.code || 'en';
  if (!locale) return fallback;

  const normalized = normalizeLanguageCode(locale);
  if (languages.some((l) => l.code === normalized)) return normalized;

  const alias = LANGUAGE_CODE_ALIASES[normalized];
  if (alias && languages.some((l) => l.code === alias)) return alias;

  const [base] = normalized.split('-');
  if (languages.some((l) => l.code === base)) return base;
  return fallback;
};

type PostTranslationProps = {
  text: string;
  visible: boolean;
  onHide: () => void;
};

export const PostTranslation = React.memo(function PostTranslation({ text, visible, onHide }: PostTranslationProps) {
  const { t, currentLocale } = useTranslation();
  const translationMutation = usePostTranslation();

  const [isLanguagePickerVisible, setIsLanguagePickerVisible] = useState(false);
  const [hasUserSelectedLanguage, setHasUserSelectedLanguage] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(() =>
    resolveLanguageCode(currentLocale, DEFAULT_LIBRETRANSLATE_LANGUAGES),
  );

  const languagesQuery = useLibreTranslateLanguages(isLanguagePickerVisible || visible);
  const languages = languagesQuery.data?.languages ?? DEFAULT_LIBRETRANSLATE_LANGUAGES;

  const iconColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'text');
  const borderColor = useThemeColor({ light: '#e8eaed', dark: '#2d3133' }, 'background');
  const dividerColor = useThemeColor({ light: 'rgba(0, 0, 0, 0.08)', dark: 'rgba(255, 255, 255, 0.16)' }, 'background');
  const translationBg = useThemeColor({ light: '#f1f3f5', dark: '#1f2123' }, 'background');
  const modalBg = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');

  useEffect(() => {
    const resolvedLanguage = resolveLanguageCode(currentLocale, languages);
    if (!languages.some((l) => l.code === selectedLanguage)) {
      if (selectedLanguage !== resolvedLanguage) setSelectedLanguage(resolvedLanguage);
      return;
    }
    if (!hasUserSelectedLanguage && selectedLanguage !== resolvedLanguage) {
      setSelectedLanguage(resolvedLanguage);
    }
  }, [currentLocale, hasUserSelectedLanguage, languages, selectedLanguage]);

  const languageNameMap = useMemo(() => new Map(languages.map((l) => [l.code, l.name])), [languages]);
  const selectedLanguageName = languageNameMap.get(selectedLanguage) ?? selectedLanguage.toUpperCase();

  const performTranslation = useCallback(
    async (targetLanguage: string) => {
      if (!text.trim()) {
        setTranslationError(t('post.translation.noText'));
        return;
      }
      setTranslationError(null);
      try {
        const { translatedText } = await translationMutation.mutateAsync({ text, targetLanguage });
        setTranslationCache((prev) => ({ ...prev, [targetLanguage]: translatedText }));
      } catch (error) {
        const msg = error instanceof Error && error.message ? error.message : null;
        if (__DEV__) console.warn('Failed to translate post', error);
        setTranslationError(msg ? `${t('post.translation.error')} (${msg})` : t('post.translation.error'));
      }
    },
    [text, t, translationMutation],
  );

  const handleLanguageSelect = useCallback(
    (code: string) => {
      setSelectedLanguage(code);
      setHasUserSelectedLanguage(true);
      setIsLanguagePickerVisible(false);
      if (translationCache[code]) {
        setTranslationError(null);
        return;
      }
      void performTranslation(code);
    },
    [performTranslation, translationCache],
  );

  const handleHide = useCallback(() => {
    onHide();
    setTranslationError(null);
    translationMutation.reset();
  }, [onHide, translationMutation]);

  useEffect(() => {
    if (!visible || !text.trim()) return;
    if (translationCache[selectedLanguage] || translationMutation.isPending) return;
    void performTranslation(selectedLanguage);
  }, [visible, performTranslation, selectedLanguage, translationCache, translationMutation.isPending, text]);

  if (!visible) return null;

  return (
    <>
      <ThemedView style={[styles.translationContainer, { backgroundColor: translationBg, borderColor }]}>
        <View style={styles.translationHeader}>
          <ThemedText style={styles.translationTitle}>{t('post.translation.title')}</ThemedText>
          <TouchableOpacity onPress={handleHide} accessibilityRole="button" accessibilityLabel={t('post.translation.hide')} activeOpacity={activeOpacity.strong}>
            <ThemedText style={[styles.translationHide, { color: iconColor }]}>{t('post.translation.hide')}</ThemedText>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.translationLanguageSelector, { borderColor: dividerColor }]}
          onPress={() => setIsLanguagePickerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('post.translation.selectLanguage')}
          activeOpacity={activeOpacity.default}
        >
          <ThemedText style={styles.translationLabel}>{t('post.translation.to')}</ThemedText>
          <ThemedText style={styles.translationLanguageValue}>{selectedLanguageName}</ThemedText>
        </TouchableOpacity>
        <ThemedView style={styles.translationContent}>
          {translationMutation.isPending ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : translationError ? (
            <ThemedText style={styles.translationError}>{translationError}</ThemedText>
          ) : (
            <ThemedText style={styles.translationText}>{translationCache[selectedLanguage]}</ThemedText>
          )}
        </ThemedView>
      </ThemedView>

      <Modal transparent animationType="fade" visible={isLanguagePickerVisible} onRequestClose={() => setIsLanguagePickerVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setIsLanguagePickerVisible(false)}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback>
              <ThemedView style={[styles.languageModal, { backgroundColor: modalBg, borderColor }]} accessibilityRole="menu">
                <ThemedText style={styles.languageModalTitle}>{t('post.translation.selectLanguage')}</ThemedText>
                {languagesQuery.isLoading ? (
                  <View style={styles.languageModalIndicator}>
                    <ActivityIndicator size="small" color={iconColor} />
                  </View>
                ) : (
                  <ScrollView style={styles.languageList}>
                    {languages.map((language) => {
                      const isSelected = language.code === selectedLanguage;
                      return (
                        <TouchableOpacity
                          key={language.code}
                          style={[styles.languageOption, { borderColor: dividerColor }, isSelected && styles.languageOptionSelected]}
                          onPress={() => handleLanguageSelect(language.code)}
                          accessibilityRole="menuitem"
                          accessibilityState={{ selected: isSelected }}
                          activeOpacity={activeOpacity.default}
                        >
                          <ThemedText style={[styles.languageOptionText, isSelected && styles.languageOptionSelectedText]}>
                            {language.name}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </ThemedView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  translationContainer: {
    borderWidth: layout.border,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  translationTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  translationHide: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  translationLanguageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: layout.border,
    borderBottomWidth: layout.border,
  },
  translationLabel: {
    fontSize: fontSize.md,
    opacity: opacity.secondary,
  },
  translationLanguageValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  translationContent: {
    marginTop: spacing.sm,
  },
  translationText: {
    fontSize: 15,
    lineHeight: 22,
  },
  translationError: {
    fontSize: fontSize.md,
    lineHeight: 20,
    color: semanticColors.danger,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  languageModal: {
    alignSelf: 'center',
    marginTop: 120,
    borderWidth: layout.border,
    width: '80%',
    maxHeight: '70%',
    padding: spacing.lg,
  },
  languageModalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  languageList: {
    maxHeight: 300,
  },
  languageOption: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderWidth: layout.border,
    marginBottom: spacing.sm,
  },
  languageOptionSelected: {
    borderColor: '#0a84ff',
  },
  languageOptionText: {
    fontSize: fontSize.base,
  },
  languageOptionSelectedText: {
    fontWeight: fontWeight.semibold,
  },
  languageModalIndicator: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
});
