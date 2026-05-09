/**
 * Splits a long body of text into thread-sized chunks, preferring
 * paragraph breaks → sentence ends → word boundaries → hard cuts.
 *
 * `maxChars` is interpreted as JS string length (not graphemes), to
 * match the rest of the composer which counts UTF-16 code units. The
 * server-side limit is 300 graphemes; we default to 300 here and the
 * caller can dial it down if it wants headroom.
 */
export function splitForThread(text: string, maxChars: number): string[] {
  if (maxChars <= 0) return [text];
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];
  if (trimmed.length <= maxChars) return [trimmed];

  const chunks: string[] = [];
  let remaining = trimmed;

  while (remaining.length > maxChars) {
    const window = remaining.slice(0, maxChars);

    // Try splitting at the last paragraph break inside the window.
    let cut = window.lastIndexOf('\n\n');
    if (cut < Math.floor(maxChars * 0.4)) cut = -1;

    if (cut < 0) {
      // Then try sentence-ending punctuation followed by space/newline.
      const sentenceMatches = [...window.matchAll(/[.!?](?=\s|$)/g)];
      const last = sentenceMatches[sentenceMatches.length - 1];
      if (last && (last.index ?? -1) >= Math.floor(maxChars * 0.4)) {
        cut = (last.index ?? 0) + 1; // include the punctuation
      }
    }

    if (cut < 0) {
      // Then any whitespace.
      const wsMatch = window.match(/\s\S*$/);
      if (wsMatch && (wsMatch.index ?? -1) >= Math.floor(maxChars * 0.3)) {
        cut = wsMatch.index ?? -1;
      }
    }

    if (cut < 0) {
      // Fall back to a hard cut at the window edge.
      cut = maxChars;
    }

    const piece = remaining.slice(0, cut).trim();
    if (piece.length > 0) chunks.push(piece);
    remaining = remaining.slice(cut).replace(/^\s+/, '');
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

/**
 * Returns an array of `${i + 1}/${n}` indicators for the chunk count.
 * Returns `null` for `n <= 1` (no numbering needed).
 */
export function threadCounters(n: number): string[] | null {
  if (n <= 1) return null;
  return Array.from({ length: n }, (_, i) => `${i + 1}/${n}`);
}
