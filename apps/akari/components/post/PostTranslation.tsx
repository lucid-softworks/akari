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

  useEffect(() => {
    if (!visible || !text.trim() || translatedText) return;

    setError(false);

    // Translate post text
    const postTranslation = translationMutation.mutateAsync({
      text: text.trim(),
      targetLanguage,
    });

    // Translate embed text separately if present
    const hasEmbedText = embedText?.title || embedText?.description;
    const embedParts = [embedText?.title, embedText?.description].filter(Boolean).join('\n\n');
    const embedTranslation = hasEmbedText
      ? fetch('https://translate.akari.blue/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: embedParts, source: 'auto', target: targetLanguage }),
        }).then((r) => r.json()).catch(() => null)
      : Promise.resolve(null);

    Promise.all([postTranslation, embedTranslation]).then(([postResult, embedResult]) => {
      setTranslatedText(postResult.translatedText);
      setDetectedLanguage(postResult.detectedLanguage ?? null);

      if (onEmbedTranslated && embedResult?.translatedText) {
        const lines = embedResult.translatedText.split('\n\n');
        if (embedText?.title && embedText?.description) {
          onEmbedTranslated({ title: lines[0], description: lines.slice(1).join('\n\n') });
        } else if (embedText?.title) {
          onEmbedTranslated({ title: embedResult.translatedText });
        } else {
          onEmbedTranslated({ description: embedResult.translatedText });
        }
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
