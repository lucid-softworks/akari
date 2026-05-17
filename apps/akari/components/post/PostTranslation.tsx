import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

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
  textStyle?: StyleProp<TextStyle>;
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
  const { t, currentLocale } = useTranslation();
  const translationMutation = usePostTranslation();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translatedFacets, setTranslatedFacets] = useState<any[] | undefined>(undefined);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const linkColor = useThemeColor({}, 'tint');
  const secondaryColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');

  const targetLanguage = currentLocale?.split('-')[0] || 'en';

  useEffect(() => {
    if (!visible || !text.trim() || translatedText) return;

    setError(false);

    // Extract links from facets and replace with placeholders before translating
    // so the translation API doesn't mangle URLs
    type LinkPlaceholder = { placeholder: string; uri: string; features: any[] };
    const placeholders: LinkPlaceholder[] = [];
    let textToTranslate = text.trim();

    if (facets) {
      // Process facets in reverse order so byte offsets stay valid
      const sortedFacets = [...facets].toSorted((a, b) => b.index.byteStart - a.index.byteStart);
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const bytes = encoder.encode(textToTranslate);

      for (const facet of sortedFacets) {
        // oxlint-disable-next-line react-doctor/js-index-maps -- features array differs per facet; no shared lookup table to build
        const linkFeature = facet.features.find((f: any) =>
          f.$type === 'app.bsky.richtext.facet#link' && f.uri
        );
        if (linkFeature) {
          const placeholder = `[LINK${placeholders.length}]`;
          placeholders.unshift({ placeholder, uri: linkFeature.uri, features: facet.features });

          const before = decoder.decode(bytes.slice(0, facet.index.byteStart));
          const after = decoder.decode(bytes.slice(facet.index.byteEnd));
          textToTranslate = before + placeholder + after;
        }
      }
    }

    // Translate post text
    const postTranslation = translationMutation.mutateAsync({
      text: textToTranslate,
      targetLanguage,
    });

    // Translate embed text separately if present, via the same mutation so
    // we share the react-query plumbing instead of a stray fetch in an effect.
    const hasEmbedText = embedText?.title || embedText?.description;
    const embedParts = [embedText?.title, embedText?.description].filter(Boolean).join('\n\n');
    const embedTranslation: Promise<{ translatedText: string } | null> = hasEmbedText
      ? translationMutation
          .mutateAsync({ text: embedParts, targetLanguage })
          .catch(() => null)
      : Promise.resolve(null);

    Promise.all([postTranslation, embedTranslation]).then(([postResult, embedResult]) => {
      // Swap placeholders back with original link text and rebuild facets
      let translated = postResult.translatedText;
      const newFacets: any[] = [];
      const enc = new TextEncoder();

      for (const { placeholder, uri, features } of placeholders) {
        const idx = translated.indexOf(placeholder);
        if (idx === -1) continue;

        // Replace placeholder with the original URL text
        const displayUrl = uri.replace(/^https?:\/\//, '').replace(/\/$/, '');
        translated = translated.slice(0, idx) + displayUrl + translated.slice(idx + placeholder.length);

        // Recalculate byte offsets after replacement
        const newBeforeBytes = enc.encode(translated.slice(0, idx));
        const newLinkBytes = enc.encode(displayUrl);

        newFacets.push({
          index: { byteStart: newBeforeBytes.length, byteEnd: newBeforeBytes.length + newLinkBytes.length },
          features,
        });
      }

      setTranslatedText(translated);
      setTranslatedFacets(newFacets.length > 0 ? newFacets : undefined);
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
      return undefined;
    }).catch(() => {
      setError(true);
    });
  }, [
    visible,
    text,
    targetLanguage,
    translatedText,
    translationMutation,
    onEmbedTranslated,
    embedText?.title,
    embedText?.description,
    facets,
  ]);

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
            {languageName ? `${t('post.translation.translatedFrom', { language: languageName })} · ` : `${t('post.translation.title')} · `}
          </ThemedText>
          <Pressable onPress={handleShowOriginal} style={({ pressed }) => pressed && { opacity: activeOpacity.default }}>
            <ThemedText style={[styles.showOriginal, { color: linkColor }]}>{t('post.translation.showOriginal')}</ThemedText>
          </Pressable>
        </View>
        <RichTextWithFacets text={translatedText} facets={translatedFacets} style={textStyle} />
      </View>
    );
  }

  // Show original text (with optional loading/error below)
  return (
    <View>
      <RichTextWithFacets text={text} facets={facets} style={textStyle} />
      {visible && error ? (
        <ThemedText style={[styles.errorText, { color: semanticColors.danger }]}>
          {t('post.translation.failed')}
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
