import { tokenize } from '@atcute/bluesky-richtext-parser';

/**
 * Detects URLs, mentions, and hashtags in plain text and produces atproto
 * richtext facets so receiving clients can linkify them. Without this the
 * post body is just plain text — no clickable links, no real @mentions,
 * no hashtag feeds.
 *
 * atproto facet byte indices are UTF-8 offsets, not JS string indices, so
 * we encode each token's raw substring and walk byte-by-byte.
 */

export type Facet = {
  index: { byteStart: number; byteEnd: number };
  features: { $type: string; uri?: string; tag?: string; did?: string }[];
};

export type ResolveHandle = (handle: string) => Promise<string | null>;

/**
 * Default resolver that hits the public bsky.social handle resolver.
 * Returns `null` for unknown handles (the parser includes some fuzzy
 * matches that aren't real accounts) — those are dropped from the facet
 * list rather than producing a broken mention.
 */
export async function defaultResolveHandle(handle: string): Promise<string | null> {
  const cleaned = handle.startsWith('@') ? handle.slice(1) : handle;
  try {
    const res = await fetch(
      `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(cleaned)}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { did?: string };
    return body.did ?? null;
  } catch {
    return null;
  }
}

/**
 * Walks the parsed token stream, emits a facet for each linkable token, and
 * resolves mention handles to DIDs in parallel. Unresolved mentions are
 * skipped so the published post doesn't carry a malformed mention.
 */
export async function detectFacets(
  text: string,
  resolveHandle: ResolveHandle = defaultResolveHandle,
): Promise<Facet[]> {
  if (!text) return [];

  const encoder = new TextEncoder();
  const tokens = tokenize(text);

  type Pending =
    | { kind: 'link'; byteStart: number; byteEnd: number; uri: string }
    | { kind: 'mention'; byteStart: number; byteEnd: number; handle: string }
    | { kind: 'tag'; byteStart: number; byteEnd: number; tag: string };

  const pending: Pending[] = [];
  let byteCursor = 0;

  for (const tok of tokens) {
    const rawBytes = encoder.encode(tok.raw).byteLength;
    const byteStart = byteCursor;
    const byteEnd = byteCursor + rawBytes;
    byteCursor = byteEnd;

    if (tok.type === 'autolink' || tok.type === 'link') {
      pending.push({ kind: 'link', byteStart, byteEnd, uri: tok.url });
    } else if (tok.type === 'mention') {
      pending.push({ kind: 'mention', byteStart, byteEnd, handle: tok.handle });
    } else if (tok.type === 'topic') {
      pending.push({ kind: 'tag', byteStart, byteEnd, tag: tok.name });
    }
  }

  // Resolve unique mention handles in parallel — repeated @user references
  // share one lookup.
  const uniqueHandles = Array.from(
    new Set(pending.flatMap((p) => (p.kind === 'mention' ? [p.handle] : []))),
  );
  const handleToDid = new Map<string, string | null>();
  await Promise.all(
    uniqueHandles.map(async (handle) => {
      handleToDid.set(handle, await resolveHandle(handle));
    }),
  );

  const facets: Facet[] = [];
  for (const p of pending) {
    if (p.kind === 'link') {
      facets.push({
        index: { byteStart: p.byteStart, byteEnd: p.byteEnd },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: p.uri }],
      });
    } else if (p.kind === 'mention') {
      const did = handleToDid.get(p.handle);
      if (did) {
        facets.push({
          index: { byteStart: p.byteStart, byteEnd: p.byteEnd },
          features: [{ $type: 'app.bsky.richtext.facet#mention', did }],
        });
      }
    } else if (p.kind === 'tag') {
      facets.push({
        index: { byteStart: p.byteStart, byteEnd: p.byteEnd },
        features: [{ $type: 'app.bsky.richtext.facet#tag', tag: p.tag }],
      });
    }
  }

  return facets;
}

/**
 * Synchronous URL-only facet builder. Kept for callers that can't afford
 * the async handle-resolution round-trip (chat messages today). New code
 * should prefer `detectFacets`, which also handles mentions and hashtags.
 */
const URL_RX = /https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]]/gi;

export function buildLinkFacets(text: string): Facet[] {
  const encoder = new TextEncoder();
  const facets: Facet[] = [];
  for (const match of text.matchAll(URL_RX)) {
    const url = match[0];
    const charStart = match.index ?? 0;
    const byteStart = encoder.encode(text.slice(0, charStart)).byteLength;
    const byteEnd = byteStart + encoder.encode(url).byteLength;
    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }],
    });
  }
  return facets;
}
