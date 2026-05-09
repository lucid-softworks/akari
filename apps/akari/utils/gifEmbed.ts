/**
 * GIF detection for external embeds. Bluesky doesn't have a dedicated
 * lexicon for GIFs — providers like Tenor, Giphy, and Klipy share the
 * `app.bsky.embed.external` shape with the rest of the link cards, so
 * detection is URI-based.
 *
 * The simple `uri.endsWith('.gif')` check breaks the moment a provider
 * appends query parameters (Klipy's `?hh=…&ww=…&mp4=…&webm=…`); this
 * helper inspects the parsed pathname instead, plus a handful of well-
 * known animated-content hosts that always produce GIF-shaped embeds
 * even when the URI itself doesn't carry a recognisable extension.
 */

const GIF_HOSTS = new Set<string>([
  'tenor.com',
  'media.tenor.com',
  'media1.tenor.com',
  'media2.tenor.com',
  'media3.tenor.com',
  'giphy.com',
  'media.giphy.com',
  'media0.giphy.com',
  'media1.giphy.com',
  'media2.giphy.com',
  'media3.giphy.com',
  'media4.giphy.com',
  'klipy.com',
  'static.klipy.com',
  'i.imgur.com',
]);

const GIF_PATH_EXTENSIONS = ['.gif', '.gifv'];

function tryParse(uri: string): URL | null {
  try {
    return new URL(uri);
  } catch {
    return null;
  }
}

function pathHasGifExtension(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return GIF_PATH_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** True when the URI looks like an animated-image embed we should render inline. */
export function isGifEmbedUri(uri: string | undefined | null): boolean {
  if (!uri) return false;
  const parsed = tryParse(uri);
  if (parsed) {
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (GIF_HOSTS.has(host)) return true;
    if (pathHasGifExtension(parsed.pathname)) return true;
    return false;
  }
  // Fallback for relative / malformed URIs — strip any query string so
  // `something.gif?x=y` still classifies as a GIF.
  const pathOnly = uri.split('?')[0]?.split('#')[0] ?? uri;
  return pathHasGifExtension(pathOnly);
}
