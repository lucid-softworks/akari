import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { MarkdownText } from '@/components/MarkdownText';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, semanticColors, spacing } from '@/constants/tokens';
import { useStandardDocument } from '@/hooks/queries/useStandardDocument';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import type { UnthreadRef } from '@/utils/unthread';

const COLLAPSED_LIMIT = 280;

type UnthreadEmbedProps = {
  unthread: UnthreadRef;
  /**
   * The post's own (cleaned) text — shown as the preview while the
   * underlying `site.standard.document` is still loading or if it can't be
   * fetched. Treated as a stand-in for the document's body, since Bluesky
   * unthread posts already carry a truncated preview in `record.text`.
   */
  fallbackText?: string;
};

/**
 * Inline body of an unthread post. The post's own text is suppressed by the
 * caller (PostCard), so this component is responsible for both the visible
 * preview and the expand-to-read flow. Behaviour:
 *
 * - Collapsed: shows the first ~280 characters of the document's body
 *   (`textContent || description`) — falling back to the post's preview text
 *   while the record is loading or if the fetch fails.
 * - Expanded: shows the full body inline. Title is intentionally not
 *   rendered; the body itself usually leads with one.
 * - The "Read more" / "Collapse" toggle only appears when the body actually
 *   exceeds the preview limit.
 */
export function UnthreadEmbed({ unthread, fallbackText }: UnthreadEmbedProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const subduedColor = useThemeColor({ light: '#6B7280', dark: '#9BA1A6' }, 'text');

  const { data: doc, isError } = useStandardDocument(unthread);

  // Prefer the document's markdown body (`content.content`) for both the
  // collapsed preview and the expanded view — `MarkdownText` handles
  // length-aware AST truncation so we keep formatting on either side. Falls
  // back to plaintext while the record loads or when the doc has no markdown.
  const markdownSource = useMemo(() => {
    const content = doc?.content as { $type?: string; content?: unknown } | undefined;
    return typeof content?.content === 'string' ? content.content.trim() : '';
  }, [doc]);

  const plainText = useMemo(() => {
    return doc?.textContent?.trim() || doc?.description?.trim() || fallbackText?.trim() || '';
  }, [doc, fallbackText]);

  const hasBody = Boolean(markdownSource || plainText);
  const visibleLength = markdownSource ? doc?.textContent?.length ?? markdownSource.length : plainText.length;
  const isTruncatable = visibleLength > COLLAPSED_LIMIT;

  const handleToggle = () => {
    setExpanded((prev) => !prev);
  };

  return (
    <View>
      {hasBody ? (
        markdownSource ? (
          <MarkdownText
            source={markdownSource}
            maxVisibleChars={expanded ? undefined : COLLAPSED_LIMIT}
          />
        ) : (
          <ThemedText style={styles.body}>
            {expanded || plainText.length <= COLLAPSED_LIMIT
              ? plainText
              : `${plainText.slice(0, COLLAPSED_LIMIT).trimEnd()}…`}
          </ThemedText>
        )
      ) : isError ? (
        <ThemedText style={[styles.placeholder, { color: subduedColor }]}>
          {t('unthread.loadError')}
        </ThemedText>
      ) : null}

      {isTruncatable ? (
        <TouchableOpacity
          onPress={handleToggle}
          activeOpacity={activeOpacity.default}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? t('unthread.collapse') : t('unthread.readMore')}
          style={styles.toggleRow}
        >
          <ThemedText style={[styles.toggleLabel, { color: semanticColors.systemBlue }]}>
            {expanded ? t('unthread.collapse') : t('unthread.readMore')}
          </ThemedText>
          <IconSymbol
            name={expanded ? 'chevron.up' : 'chevron.down'}
            size={fontSize.sm}
            color={semanticColors.systemBlue}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  placeholder: {
    fontSize: fontSize.base,
    fontStyle: 'italic',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  toggleLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
