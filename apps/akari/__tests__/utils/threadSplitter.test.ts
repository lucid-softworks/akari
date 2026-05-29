import { splitForThread, threadCounters } from '@/utils/threadSplitter';

describe('splitForThread', () => {
  it('returns the original text when maxChars is non-positive', () => {
    expect(splitForThread('hello world', 0)).toEqual(['hello world']);
    expect(splitForThread('hello world', -10)).toEqual(['hello world']);
  });

  it('returns an empty array for blank input', () => {
    expect(splitForThread('', 300)).toEqual([]);
    expect(splitForThread('   \n  ', 300)).toEqual([]);
  });

  it('returns a single trimmed chunk when text fits', () => {
    expect(splitForThread('  hello world  ', 300)).toEqual(['hello world']);
  });

  it('prefers paragraph breaks when splitting', () => {
    const first = 'A'.repeat(120);
    const second = 'B'.repeat(120);
    const chunks = splitForThread(`${first}\n\n${second}`, 200);
    expect(chunks).toEqual([first, second]);
  });

  it('falls back to sentence boundaries', () => {
    const sentence1 = `${'a'.repeat(98)}.`;
    const sentence2 = `${'b'.repeat(98)}.`;
    const chunks = splitForThread(`${sentence1} ${sentence2}`, 120);
    expect(chunks[0]).toBe(sentence1);
    expect(chunks[1]).toBe(sentence2);
  });

  it('falls back to whitespace boundaries when no sentence end exists', () => {
    const word1 = 'a'.repeat(60);
    const word2 = 'b'.repeat(60);
    const word3 = 'c'.repeat(60);
    const chunks = splitForThread(`${word1} ${word2} ${word3}`, 130);
    // Each chunk should split on a space, never mid-word.
    expect(chunks.every((c) => !c.includes(' ') || c.split(' ').every(Boolean))).toBe(true);
    expect(chunks.join('').replace(/\s/g, '')).toBe(`${word1}${word2}${word3}`);
  });

  it('hard-cuts a single long unbreakable token', () => {
    const text = 'x'.repeat(250);
    const chunks = splitForThread(text, 100);
    expect(chunks).toEqual(['x'.repeat(100), 'x'.repeat(100), 'x'.repeat(50)]);
  });

  it('reassembles to the original content ignoring whitespace', () => {
    const text = 'Lorem ipsum dolor sit amet. '.repeat(40).trim();
    const chunks = splitForThread(text, 100);
    expect(chunks.every((c) => c.length <= 100 || !c.includes(' '))).toBe(true);
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(text.replace(/\s+/g, ' '));
  });
});

describe('threadCounters', () => {
  it('returns null when numbering is unnecessary', () => {
    expect(threadCounters(0)).toBeNull();
    expect(threadCounters(1)).toBeNull();
  });

  it('returns n/N style counters', () => {
    expect(threadCounters(3)).toEqual(['1/3', '2/3', '3/3']);
  });
});
