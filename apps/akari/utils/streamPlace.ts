/**
 * stream.place playback helpers.
 *
 * stream.place serves live video over WHEP (WebRTC-HTTP Egress
 * Protocol). atproto wraps the WHEP exchange in a single XRPC method
 * called `place.stream.playback.whep` whose request and response
 * bodies are both raw `application/sdp`. The query string carries the
 * streamer's DID and the rendition (we always use `source` for the
 * highest-quality variant — stream.place's own player does the same).
 *
 * Detection is URI-based; the bsky live-now config flags the post
 * author as currently broadcasting before we ever try to play, so we
 * trust that signal and don't need to call `getLiveUsers` here.
 */

const STREAMPLACE_HOSTS = new Set<string>([
  'stream.place',
  'streamplace.com',
]);

const STREAMPLACE_DEFAULT_PLAYBACK_HOST = 'https://stream.place';

function tryParse(uri: string): URL | null {
  try {
    return new URL(uri);
  } catch {
    return null;
  }
}

export function isStreamPlaceUri(uri: string | undefined | null): boolean {
  if (!uri) return false;
  const parsed = tryParse(uri);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  return STREAMPLACE_HOSTS.has(host);
}

export type WhepNegotiationResult = {
  /** SDP answer body returned by the playback host. */
  sdp: string;
};

/**
 * POST a WHEP-shaped SDP offer to stream.place and return the SDP
 * answer. The streamplace lexicon (`place.stream.playback.whep`)
 * declares its input/output encoding as the wildcard "any media
 * type"; in practice both bodies are `application/sdp` plain text.
 *
 * `playbackHost` defaults to `https://stream.place` but callers can
 * override (e.g. once `getPlaybackServer` is wired up to route to a
 * geographically-closer ingest server).
 */
export async function negotiateStreamPlaceWhep(
  streamerDid: string,
  sdpOffer: string,
  options: {
    playbackHost?: string;
    rendition?: string;
    signal?: AbortSignal;
  } = {},
): Promise<WhepNegotiationResult> {
  const host = options.playbackHost ?? STREAMPLACE_DEFAULT_PLAYBACK_HOST;
  const rendition = options.rendition ?? 'source';
  const url = `${host}/xrpc/place.stream.playback.whep?streamer=${encodeURIComponent(streamerDid)}&rendition=${encodeURIComponent(rendition)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp',
      Accept: 'application/sdp',
    },
    body: sdpOffer,
    signal: options.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`WHEP negotiation failed (${response.status}): ${text}`);
  }

  const answer = await response.text();
  if (!answer) {
    throw new Error('WHEP negotiation returned an empty SDP answer');
  }
  return { sdp: answer };
}
