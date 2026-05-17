import React, { useMemo } from 'react';
import { Linking, Platform, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { fontSize, fontWeight, semanticColors, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { parseMarkdown, truncateMarkdown, type MarkdownBlock, type MarkdownInline } from '@/utils/markdown';

const HEADING_FONT_SIZES: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {
  1: fontSize.xxl,
  2: fontSize.xl,
  3: fontSize.lg,
  4: fontSize.lg,
  5: fontSize.base,
  6: fontSize.base,
};

type MarkdownTextProps = {
  source: string;
  /**
   * When set, truncate the parsed AST to roughly this many visible characters
   * — preserving formatting (headings stay headings, links stay links) and
   * appending an ellipsis at the cut point. Useful for collapsed previews.
   */
  maxVisibleChars?: number;
};

/**
 * Render a parsed markdown subset (`utils/markdown`) inline as React Native
 * text. No surrounding container — the caller controls margins / containers.
 */
export function MarkdownText({ source, maxVisibleChars }: MarkdownTextProps) {
  const blocks = useMemo(() => {
    const parsed = parseMarkdown(source);
    if (maxVisibleChars === undefined) return parsed;
    return truncateMarkdown(parsed, maxVisibleChars);
  }, [source, maxVisibleChars]);
  const codeBackground = useThemeColor({ light: '#f3f4f6', dark: '#1f2326' }, 'background');

  return (
    <>
      {blocks.map((block, blockIndex) => (
        <BlockRenderer
          // oxlint-disable-next-line react/no-array-index-key -- markdown blocks have no stable id; the AST is rebuilt from `source` each render and order is deterministic
          key={blockIndex}
          block={block}
          isFirst={blockIndex === 0}
          codeBackground={codeBackground}
        />
      ))}
    </>
  );
}

function BlockRenderer({
  block,
  isFirst,
  codeBackground,
}: {
  block: MarkdownBlock;
  isFirst: boolean;
  codeBackground: string;
}) {
  if (block.type === 'heading') {
    return (
      <ThemedText
        style={[
          styles.heading,
          {
            fontSize: HEADING_FONT_SIZES[block.level],
            marginTop: isFirst ? 0 : spacing.md,
          },
        ]}
      >
        <InlineRenderer inline={block.inline} codeBackground={codeBackground} />
      </ThemedText>
    );
  }

  return (
    <ThemedText style={[styles.paragraph, { marginTop: isFirst ? 0 : spacing.sm }]}>
      <InlineRenderer inline={block.inline} codeBackground={codeBackground} />
    </ThemedText>
  );
}

function InlineRenderer({
  inline,
  codeBackground,
}: {
  inline: MarkdownInline[];
  codeBackground: string;
}) {
  return (
    <>
      {inline.map((node, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- inline markdown nodes have no stable id; the AST is rebuilt deterministically each render
        <InlineNode key={`${node.type}-${index}`} node={node} codeBackground={codeBackground} />
      ))}
    </>
  );
}

function InlineNode({
  node,
  codeBackground,
}: {
  node: MarkdownInline;
  codeBackground: string;
}) {
  switch (node.type) {
    case 'text':
      return <ThemedText>{node.text}</ThemedText>;
    case 'link':
      return (
        <ThemedText
          style={{ color: semanticColors.systemBlue }}
          onPress={() => void Linking.openURL(node.url)}
        >
          {node.text}
        </ThemedText>
      );
    case 'code':
      return (
        <ThemedText style={[styles.code, { backgroundColor: codeBackground }]}>
          {node.text}
        </ThemedText>
      );
    case 'bold':
      return (
        <ThemedText style={styles.bold}>
          <InlineRenderer inline={node.children} codeBackground={codeBackground} />
        </ThemedText>
      );
    case 'italic':
      return (
        <ThemedText style={styles.italic}>
          <InlineRenderer inline={node.children} codeBackground={codeBackground} />
        </ThemedText>
      );
  }
}

const styles = StyleSheet.create({
  heading: {
    fontWeight: fontWeight.bold,
    lineHeight: 24,
  },
  paragraph: {
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  bold: {
    fontWeight: fontWeight.bold,
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: fontSize.sm,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});
