/**
 * Detects URLs in plain text and produces atproto richtext facets so
 * receivers (any conformant client, not just ours) can linkify them.
 *
 * atproto facet byte indices are UTF-8 offsets, not JS string indices, so
 * we encode and walk byte-by-byte through the matches.
 */

export type Facet = {
  index: { byteStart: number; byteEnd: number };
  features: { $type: string; uri?: string; tag?: string; did?: string }[];
};

const URL_RX = /https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]]/gi;

export function buildLinkFacets(text: string): Facet[] {
  const encoder = new TextEncoder();
  const facets: Facet[] = [];

  for (const match of text.matchAll(URL_RX)) {
    const url = match[0];
    const charStart = match.index ?? 0;
    const charEnd = charStart + url.length;
    const byteStart = encoder.encode(text.slice(0, charStart)).byteLength;
    const byteEnd = byteStart + encoder.encode(url).byteLength;
    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }],
    });
  }

  return facets;
}
