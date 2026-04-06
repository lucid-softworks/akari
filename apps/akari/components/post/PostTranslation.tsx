import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { usePostTranslation } from '@/hooks/mutations/usePostTranslation';
import { spacing, fontSize, fontWeight, opacity, activeOpacity, semanticColors } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type PostTranslationProps = {
  text: string;
  visible: boolean;
  onHide: () => void;
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', ru: 'Russian', ja: 'Japanese',
  ko: 'Korean', zh: 'Chinese', ar: 'Arabic', hi: 'Hindi', tr: 'Turkish',
  sv: 'Swedish', da: 'Danish', no: 'Norwegian', fi: 'Finnish', cs: 'Czech',
  uk: 'Ukrainian', el: 'Greek', he: 'Hebrew', th: 'Thai', vi: 'Vietnamese',
  id: 'Indonesian', ms: 'Malay', ro: 'Romanian', hu: 'Hungarian', bg: 'Bulgarian',
  ca: 'Catalan', hr: 'Croatian', sk: 'Slovak', sl: 'Slovenian', lt: 'Lithuanian',
  lv: 'Latvian', et: 'Estonian', ga: 'Irish', cy: 'Welsh', sq: 'Albanian',
};

export const PostTranslation = React.memo(function PostTranslation({ text, visible, onHide }: PostTranslationProps) {
  const { currentLocale } = useTranslation();
  const translationMutation = usePostTranslation();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const linkColor = useThemeColor({}, 'tint');
  const secondaryColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');

  // Get target language from user's locale (e.g. en-GB -> en)
  const targetLanguage = currentLocale?.split('-')[0] || 'en';

  useEffect(() => {
    if (!visible || !text.trim() || translatedText) return;

    setError(false);
    translationMutation.mutateAsync({
      text,
      targetLanguage,
    }).then((result) => {
      setTranslatedText(result.translatedText);
      setDetectedLanguage(result.detectedLanguage ?? null);
    }).catch(() => {
      setError(true);
    });
  }, [visible, text, targetLanguage]);

  const handleShowOriginal = useCallback(() => {
    onHide();
  }, [onHide]);

  if (!visible) return null;

  if (translationMutation.isPending) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={secondaryColor} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ThemedText style={[styles.errorText, { color: semanticColors.danger }]}>
          Translation failed
        </ThemedText>
      </View>
    );
  }

  if (!translatedText) return null;

  const languageName = detectedLanguage
    ? LANGUAGE_NAMES[detectedLanguage] ?? detectedLanguage
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={[styles.headerText, { color: secondaryColor }]}>
          {languageName ? `Translated from ${languageName} · ` : 'Translated · '}
        </ThemedText>
        <TouchableOpacity onPress={handleShowOriginal} activeOpacity={activeOpacity.default}>
          <ThemedText style={[styles.showOriginal, { color: linkColor }]}>Show original</ThemedText>
        </TouchableOpacity>
      </View>
      <ThemedText style={styles.translatedText}>{translatedText}</ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerText: {
    fontSize: fontSize.sm,
  },
  showOriginal: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  translatedText: {
    fontSize: fontSize.lg,
    lineHeight: 24,
  },
  errorText: {
    fontSize: fontSize.sm,
  },
});
