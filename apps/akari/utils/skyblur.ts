/**
 * Skyblur (https://skyblur.uk) is a third-party AT-Protocol app that
 * lets posters publish text with redacted words. The user composes a
 * post like `my favourite colour is [red]`, Skyblur publishes a
 * regular `app.bsky.feed.post` containing the same text with the
 * bracketed words masked as asterisks (`my favourite colour is ***.`)
 * plus an `app.bsky.embed.external` link pointing at the Skyblur
 * record. The full text — with the original `[bracketed]` words — is
 * stored on the author's PDS under the `uk.skyblur.post` collection.
 *
 * These helpers let us recognise Skyblur posts in a feed and resolve
 * the AT URI of the source record so we can fetch the original text
 * and render the brackets as tap-to-reveal tokens.
 */

const SKYBLUR_HOST = 'skyblur.uk';

export type SkyblurRef = {
  did: string;
  rkey: string;
  /** Reconstructed AT URI for the Skyblur record on the author's PDS. */
  uri: string;
};

/**
 * Parses a Skyblur external-embed URL into the AT record reference, or
 * null if `url` isn't a Skyblur post URL.
 *
 *   https://skyblur.uk/post/did:plc:abc.../3kxy...
 *     → { did: "did:plc:abc...", rkey: "3kxy...", uri: "at://did:plc:abc.../uk.skyblur.post/3kxy..." }
 */
export function parseSkyblurUrl(url: string | undefined | null): SkyblurRef | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== SKYBLUR_HOST) return null;
  // Pathname: /post/<did>/<rkey>
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts.length < 3 || parts[0] !== 'post') return null;
  const did = decodeURIComponent(parts[1]);
  const rkey = decodeURIComponent(parts[2]);
  if (!did.startsWith('did:') || !rkey) return null;
  return {
    did,
    rkey,
    uri: `at://${did}/uk.skyblur.post/${rkey}`,
  };
}

/**
 * Subset of the `uk.skyblur.post` record schema we actually render. The
 * lexicon also carries listUri / createdAt / encryptBody — we ignore
 * those (encrypted bodies need an AES-256 decrypt path which isn't
 * implemented here yet, so password-protected posts fall back to the
 * masked bsky text).
 */
export type SkyblurRecordValue = {
  /**
   * Required main contents. Originally-redacted words are wrapped in
   * `[brackets]`, e.g. `my favourite colour is [red].`.
   */
  text?: string;
  /** Optional long-form addendum (up to ~10k graphemes). */
  additional?: string;
  /**
   * Visibility gate. We honour `public` directly; everything else gets
   * surfaced via `text` if present but otherwise won't have real
   * content to show (e.g. `password` only has `[]` placeholders in
   * `text` and the full body sits in `encryptBody` blob).
   */
  visibility?: 'public' | 'password' | 'login' | 'followers' | 'following' | 'mutual' | 'list';
};

/** Picks the source text out of a fetched Skyblur record. */
export function skyblurTextOf(value: SkyblurRecordValue | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value.text === 'string') return value.text;
  return undefined;
}
