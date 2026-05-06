import { parseInline, parseMarkdown, truncateMarkdown } from '@/utils/markdown';

describe('parseInline', () => {
  it('parses inline links', () => {
    const tokens = parseInline('hello [world](https://example.com)!');
    expect(tokens).toEqual([
      { type: 'text', text: 'hello ' },
      { type: 'link', text: 'world', url: 'https://example.com' },
      { type: 'text', text: '!' },
    ]);
  });

  it('parses inline code', () => {
    const tokens = parseInline('use the `at://` scheme');
    expect(tokens).toEqual([
      { type: 'text', text: 'use the ' },
      { type: 'code', text: 'at://' },
      { type: 'text', text: ' scheme' },
    ]);
  });

  it('parses bold preferring `**` over `*`', () => {
    const tokens = parseInline('a **bold** word');
    expect(tokens).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'bold', children: [{ type: 'text', text: 'bold' }] },
      { type: 'text', text: ' word' },
    ]);
  });

  it('parses italic with `*` and `_`', () => {
    const a = parseInline('an *italic* word');
    const b = parseInline('an _italic_ word');
    expect(a[1]).toEqual({ type: 'italic', children: [{ type: 'text', text: 'italic' }] });
    expect(b[1]).toEqual({ type: 'italic', children: [{ type: 'text', text: 'italic' }] });
  });

  it('passes unknown markup through as text', () => {
    const tokens = parseInline('plain text [partial');
    expect(tokens).toEqual([{ type: 'text', text: 'plain text [partial' }]);
  });
});

describe('parseMarkdown', () => {
  it('parses headings of multiple levels', () => {
    const blocks = parseMarkdown('# Title\n\n### Subtitle');
    expect(blocks).toEqual([
      {
        type: 'heading',
        level: 1,
        inline: [{ type: 'text', text: 'Title' }],
      },
      {
        type: 'heading',
        level: 3,
        inline: [{ type: 'text', text: 'Subtitle' }],
      },
    ]);
  });

  it('separates paragraphs by blank lines', () => {
    const blocks = parseMarkdown('First paragraph.\n\nSecond paragraph.');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[1].type).toBe('paragraph');
  });

  it('parses a heading followed by a paragraph with a link', () => {
    const blocks = parseMarkdown('# Hello\n\nVisit [the site](https://example.com).');
    expect(blocks).toEqual([
      {
        type: 'heading',
        level: 1,
        inline: [{ type: 'text', text: 'Hello' }],
      },
      {
        type: 'paragraph',
        inline: [
          { type: 'text', text: 'Visit ' },
          { type: 'link', text: 'the site', url: 'https://example.com' },
          { type: 'text', text: '.' },
        ],
      },
    ]);
  });

  it('clamps headings deeper than 6 to level 6', () => {
    const blocks = parseMarkdown('####### too deep');
    expect(blocks[0]).toEqual({
      type: 'paragraph',
      inline: [{ type: 'text', text: '####### too deep' }],
    });
  });

  it('drops leading/trailing blank chunks', () => {
    const blocks = parseMarkdown('\n\nhello\n\n\n');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
  });
});

describe('truncateMarkdown', () => {
  it('keeps short content untouched', () => {
    const blocks = parseMarkdown('# Title\n\nShort body.');
    const result = truncateMarkdown(blocks, 100);
    expect(result).toEqual(blocks);
  });

  it('drops trailing blocks once the budget is hit', () => {
    const blocks = parseMarkdown('# Title\n\nFirst paragraph.\n\nSecond paragraph.');
    // Budget covers "Title" (5) + "First paragraph." (16) = 21
    const result = truncateMarkdown(blocks, 21);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: 'heading',
      level: 1,
      inline: [{ type: 'text', text: 'Title' }],
    });
    expect(result[1]).toEqual({
      type: 'paragraph',
      inline: [{ type: 'text', text: 'First paragraph.' }],
    });
  });

  it('slices the final inline text node and appends an ellipsis', () => {
    const blocks = parseMarkdown('Hello there friend');
    const result = truncateMarkdown(blocks, 5);
    expect(result).toEqual([
      {
        type: 'paragraph',
        inline: [{ type: 'text', text: 'Hello…' }],
      },
    ]);
  });

  it('preserves a link wrapper when truncating its visible text', () => {
    const blocks = parseMarkdown('See [the documentation page](https://example.com) here');
    const result = truncateMarkdown(blocks, 12);
    expect(result[0].inline[0]).toEqual({ type: 'text', text: 'See ' });
    expect(result[0].inline[1]).toEqual({
      type: 'link',
      text: 'the docu…',
      url: 'https://example.com',
    });
  });

  it('returns an empty list for a zero budget', () => {
    const blocks = parseMarkdown('Hello');
    expect(truncateMarkdown(blocks, 0)).toEqual([]);
  });
});
