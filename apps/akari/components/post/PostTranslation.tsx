import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, type TextStyle } from 'react-native';

import { RichTextWithFacets } from '@/components/RichTextWithFacets';
import { ThemedText } from '@/components/ThemedText';
import { usePostTranslation } from '@/hooks/mutations/usePostTranslation';
import { spacing, fontSize, fontWeight, activeOpacity, semanticColors } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type EmbedText = {
  title?: string;
  description?: string;
};

type TranslatedEmbed = {
  title?: string;
  description?: string;
};

type PostTranslationProps = {
  text: string;
  visible: boolean;
  onHide: () => void;
  facets?: any[];
  textStyle?: TextStyle | TextStyle[];
  embedText?: EmbedText;
  onEmbedTranslated?: (translated: TranslatedEmbed | null) => void;
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

export const PostTranslation = React.memo(function PostTranslation({
  text,
  visible,
  onHide,
  facets,
  textStyle,
  embedText,
  onEmbedTranslated,
}: PostTranslationProps) {
  const { currentLocale } = useTranslation();
  const translationMutation = usePostTranslation();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const linkColor = useThemeColor({}, 'tint');
  const secondaryColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');

  const targetLanguage = currentLocale?.split('-')[0] || 'en';

  const SEPARATOR = '\n---AKARI_SPLIT---\n';

  useEffect(() => {
    if (!visible || !text.trim() || translatedText) return;

    // Build combined text: post text + embed title + embed description
    const parts = [text.trim()];
    if (embedText?.title) parts.push(embedText.title);
    if (embedText?.description) parts.push(embedText.description);
    const combined = parts.join(SEPARATOR);

    setError(false);
    translationMutation.mutateAsync({
      text: combined,
      targetLanguage,
    }).then((result) => {
      const translated = result.translatedText;
      const splitParts = translated.split(SEPARATOR).map((s: string) => s.trim());

      setTranslatedText(splitParts[0]);
      setDetectedLanguage(result.detectedLanguage ?? null);

      // Pass translated embed text back
      if (onEmbedTranslated && parts.length > 1) {
        onEmbedTranslated({
          title: embedText?.title ? splitParts[1] : undefined,
          description: embedText?.description ? splitParts[embedText?.title ? 2 : 1] : undefined,
        });
      }
    }).catch(() => {
      setError(true);
    });
  }, [visible, text, targetLanguage]);

  const handleShowOriginal = useCallback(() => {
    onEmbedTranslated?.(null);
    onHide();
  }, [onHide, onEmbedTranslated]);

  const isTranslated = visible && translatedText && !error;

  // Show translated text header + translated content
  if (isTranslated) {
    const languageName = detectedLanguage
      ? LANGUAGE_NAMES[detectedLanguage] ?? detectedLanguage
      : null;

    return (
      <View>
        <View style={styles.header}>
          <ThemedText style={[styles.headerText, { color: secondaryColor }]}>
            {languageName ? `Translated from ${languageName} · ` : 'Translated · '}
          </ThemedText>
          <TouchableOpacity onPress={handleShowOriginal} activeOpacity={activeOpacity.default}>
            <ThemedText style={[styles.showOriginal, { color: linkColor }]}>Show original</ThemedText>
          </TouchableOpacity>
        </View>
        <ThemedText style={textStyle}>{translatedText}</ThemedText>
      </View>
    );
  }

  // Show original text (with optional loading/error below)
  return (
    <View>
      <RichTextWithFacets text={text} facets={facets} style={textStyle} />
      {visible && error ? (
        <ThemedText style={[styles.errorText, { color: semanticColors.danger }]}>
          Translation failed
        </ThemedText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
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
  errorText: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});
