/**
 * Tiny markdown parser, sufficient for the subset used by `site.standard.document`
 * (`at.unthread.content`) bodies seen in the wild: ATX headings, paragraphs,
 * inline links `[text](url)`, inline code, bold (`**…**`), and italic (`*…*` /
 * `_…_`). Lists / blockquotes / images are not handled — when we see them we
 * can extend this; until then they fall through as plain text.
 */

export type MarkdownInline =
  | { type: 'text'; text: string }
  | { type: 'link'; text: string; url: string }
  | { type: 'code'; text: string }
  | { type: 'bold'; children: MarkdownInline[] }
  | { type: 'italic'; children: MarkdownInline[] };

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; inline: MarkdownInline[] }
  | { type: 'paragraph'; inline: MarkdownInline[] };

const HEADING_REGEX = /^(#{1,6})\s+(.*)$/;

export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const chunks = source.replace(/\r\n/g, '\n').split(/\n{2,}/);

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(HEADING_REGEX);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 6) as 1 | 2 | 3 | 4 | 5 | 6;
      blocks.push({
        type: 'heading',
        level,
        inline: parseInline(headingMatch[2].trim()),
      });
      continue;
    }

    blocks.push({
      type: 'paragraph',
      inline: parseInline(trimmed),
    });
  }

  return blocks;
}

/**
 * Inline tokenizer. Order matters — code first (so backticks inside other
 * markers stay literal), then links, then bold/italic. Bold uses `**` to win
 * over italic's `*`.
 */
export function parseInline(source: string): MarkdownInline[] {
  const tokens: MarkdownInline[] = [];
  let i = 0;

  const pushText = (text: string) => {
    if (!text) return;
    const last = tokens[tokens.length - 1];
    if (last && last.type === 'text') {
      last.text += text;
    } else {
      tokens.push({ type: 'text', text });
    }
  };

  while (i < source.length) {
    const remaining = source.slice(i);

    // Inline code — backtick-delimited, no nested formatting.
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push({ type: 'code', text: codeMatch[1] });
      i += codeMatch[0].length;
      continue;
    }

    // Inline link `[text](url)`. The text inside the brackets is *not*
    // recursed — keeping it flat avoids nested-link ambiguity and matches
    // how the data we've seen is shaped.
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push({ type: 'link', text: linkMatch[1], url: linkMatch[2] });
      i += linkMatch[0].length;
      continue;
    }

    // Bold — must come before italic since `**` would otherwise be parsed
    // as two italic markers.
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      tokens.push({ type: 'bold', children: parseInline(boldMatch[1]) });
      i += boldMatch[0].length;
      continue;
    }

    const italicMatch = remaining.match(/^(?:\*([^*\n]+)\*|_([^_\n]+)_)/);
    if (italicMatch) {
      const inner = italicMatch[1] ?? italicMatch[2];
      tokens.push({ type: 'italic', children: parseInline(inner) });
      i += italicMatch[0].length;
      continue;
    }

    pushText(source[i]);
    i += 1;
  }

  return tokens;
}

/**
 * Visible-character length of an inline node (the chars a reader sees, not
 * the markdown source). Used to budget AST-level truncation so the
 * preview hits a target length without slicing tokens mid-syntax.
 */
function inlineLength(node: MarkdownInline): number {
  switch (node.type) {
    case 'text':
    case 'link':
    case 'code':
      return node.text.length;
    case 'bold':
    case 'italic':
      return node.children.reduce((sum, child) => sum + inlineLength(child), 0);
  }
}

function truncateInlineNode(node: MarkdownInline, budget: number): MarkdownInline {
  switch (node.type) {
    case 'text':
      return { type: 'text', text: `${node.text.slice(0, budget).trimEnd()}…` };
    case 'link':
      return { ...node, text: `${node.text.slice(0, budget).trimEnd()}…` };
    case 'code':
      return { type: 'code', text: `${node.text.slice(0, budget)}…` };
    case 'bold':
    case 'italic': {
      const children = truncateInline(node.children, budget).inline;
      return { ...node, children };
    }
  }
}

function truncateInline(
  inline: MarkdownInline[],
  budget: number,
): { inline: MarkdownInline[]; used: number; didTruncate: boolean } {
  const out: MarkdownInline[] = [];
  let used = 0;
  for (const node of inline) {
    if (used >= budget) return { inline: out, used, didTruncate: true };
    const len = inlineLength(node);
    if (used + len <= budget) {
      out.push(node);
      used += len;
      continue;
    }
    out.push(truncateInlineNode(node, budget - used));
    return { inline: out, used: budget, didTruncate: true };
  }
  return { inline: out, used, didTruncate: false };
}

/**
 * Truncate a parsed-markdown AST to roughly `maxVisibleChars` of *visible*
 * text. Drops trailing blocks once the budget is hit, and slices the final
 * inline node mid-token so the cut lands on a character boundary, not a
 * markdown-syntax boundary. Headings and code formatting on the surviving
 * portion stay intact.
 */
export function truncateMarkdown(blocks: MarkdownBlock[], maxVisibleChars: number): MarkdownBlock[] {
  if (maxVisibleChars <= 0) return [];
  let remaining = maxVisibleChars;
  const out: MarkdownBlock[] = [];
  for (const block of blocks) {
    if (remaining <= 0) break;
    const { inline, used, didTruncate } = truncateInline(block.inline, remaining);
    out.push({ ...block, inline } as MarkdownBlock);
    remaining -= used;
    if (didTruncate) return out;
  }
  return out;
}
