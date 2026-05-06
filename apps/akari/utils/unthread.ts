/**
 * Helpers for detecting and parsing unthread.at links — long-form Standard.site
 * (`site.standard.document`) records published as Bluesky-friendly URLs of the
 * form `https://unthread.at/{did}/{rkey}`.
 */

const UNTHREAD_HOST = 'unthread.at';
const STANDARD_DOCUMENT_COLLECTION = 'site.standard.document' as const;

export type UnthreadRef = {
  did: string;
  rkey: string;
  /** The original https://unthread.at/... URL the link came from. */
  url: string;
  /** Resolved AT-URI: `at://{did}/site.standard.document/{rkey}`. */
  atUri: string;
};

/**
 * Parse a single URL. Returns the unthread ref when the URL is a valid
 * `https://unthread.at/{did}/{rkey}` link, or `null` for anything else.
 */
export function parseUnthreadUrl(url: string | undefined | null): UnthreadRef | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.host !== UNTHREAD_HOST) return null;

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 2) return null;
  const [did, rkey] = segments;
  if (!did.startsWith('did:') || !rkey) return null;

  return {
    did,
    rkey,
    url,
    atUri: `at://${did}/${STANDARD_DOCUMENT_COLLECTION}/${rkey}`,
  };
}

type FacetFeature = { $type?: string; uri?: string } & Record<string, unknown>;
type FacetIndex = { byteStart: number; byteEnd: number };
type Facet = { index: FacetIndex; features?: FacetFeature[] } & Record<string, unknown>;

/**
 * Walk a post's facets and return the first unthread.at link, if any.
 * Bluesky stores rich-text links as `app.bsky.richtext.facet#link` features.
 */
export function findUnthreadFacet(facets: readonly Facet[] | undefined | null): UnthreadRef | null {
  if (!facets) return null;
  for (const facet of facets) {
    for (const feature of facet.features ?? []) {
      if (feature.$type !== 'app.bsky.richtext.facet#link') continue;
      const ref = parseUnthreadUrl(feature.uri);
      if (ref) return ref;
    }
  }
  return null;
}

/** UTF-8 byte offset → UTF-16 character offset (Bluesky stores facets in bytes). */
function byteToCharIndex(text: string, byteIndex: number): number {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  if (byteIndex >= bytes.length) return text.length;
  const decoder = new TextDecoder();
  return decoder.decode(bytes.slice(0, byteIndex), { stream: true }).length;
}

function isUnthreadLinkFacet(facet: Facet): boolean {
  for (const feature of facet.features ?? []) {
    if (feature.$type === 'app.bsky.richtext.facet#link' && parseUnthreadUrl(feature.uri)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns post text + facets with the first unthread.at link surgically
 * removed. Used by PostCard to render a clean preview without the dangling
 * "View full post"-style call-to-action — that role is taken over by the
 * inline `UnthreadEmbed` expander.
 *
 * - The linked byte range is sliced out of `text` and trailing whitespace
 *   trimmed so we don't leave "...\n\n" hanging at the end.
 * - The unthread facet itself is dropped from `facets`.
 * - Any facet that came *after* the removed range has its byte indices
 *   shifted left by the removed length so remaining mentions / hashtags /
 *   other links keep pointing at the right text.
 */
export function stripUnthreadFromPost(
  text: string,
  facets: readonly Facet[] | undefined,
): { text: string; facets: Facet[] | undefined } {
  if (!facets || facets.length === 0) return { text, facets: facets as Facet[] | undefined };
  const target = facets.find(isUnthreadLinkFacet);
  if (!target) return { text, facets: facets as Facet[] };

  const removedBytes = target.index.byteEnd - target.index.byteStart;
  const charStart = byteToCharIndex(text, target.index.byteStart);
  const charEnd = byteToCharIndex(text, target.index.byteEnd);
  const cleanedText = (text.slice(0, charStart) + text.slice(charEnd)).replace(/\s+$/, '');

  const remaining: Facet[] = [];
  for (const facet of facets) {
    if (facet === target) continue;
    if (facet.index.byteStart >= target.index.byteEnd) {
      remaining.push({
        ...facet,
        index: {
          byteStart: facet.index.byteStart - removedBytes,
          byteEnd: facet.index.byteEnd - removedBytes,
        },
      });
    } else {
      remaining.push(facet);
    }
  }

  return { text: cleanedText, facets: remaining };
}
