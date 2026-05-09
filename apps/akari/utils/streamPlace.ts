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

/** Public default — exported so callers can build "preferred host or default" fallbacks. */
export const STREAM_PLACE_DEFAULT_HOST = STREAMPLACE_DEFAULT_PLAYBACK_HOST;

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

export type PlaybackServerLookupResult = {
  /** Ordered list of playback host base URLs. The first entry is
   *  preferred — stream.place returns them sorted by edge proximity. */
  servers: string[];
};

/**
 * Asks stream.place which playback host should serve the given
 * streamer. Streamplace runs a fleet of edge nodes and the lookup
 * routes you to the closest one; without this we hit a fixed
 * default and pay the cross-region latency on every WHEP exchange.
 *
 * Failure is non-fatal — callers should fall back to the default
 * `https://stream.place` host on any error rather than refuse to
 * play.
 */
export async function fetchStreamPlacePlaybackServers(
  streamerDid: string,
  options: { lookupHost?: string; signal?: AbortSignal } = {},
): Promise<PlaybackServerLookupResult> {
  const host = options.lookupHost ?? STREAMPLACE_DEFAULT_PLAYBACK_HOST;
  const url = `${host}/xrpc/place.stream.playback.getPlaybackServer?stream=${encodeURIComponent(streamerDid)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`getPlaybackServer failed (${response.status})`);
  }

  const data = (await response.json()) as { servers?: unknown };
  const servers = Array.isArray(data.servers)
    ? data.servers.filter((entry): entry is string => typeof entry === 'string')
    : [];
  return { servers };
}
