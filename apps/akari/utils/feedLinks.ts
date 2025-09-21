const BSKY_WEB_BASE_URL = 'https://bsky.app';

/**
 * Normalizes a Bluesky app link so it can be opened externally
 */
export function resolveBskyLink(link: string): string {
  if (!link) {
    return BSKY_WEB_BASE_URL;
  }

  if (link.startsWith('http://') || link.startsWith('https://')) {
    return link;
  }

  if (link.startsWith('/')) {
    return `${BSKY_WEB_BASE_URL}${link}`;
  }

  return `${BSKY_WEB_BASE_URL}/${link}`;
}

/**
 * Attempts to extract an at:// feed URI from a Bluesky link
 */
export function extractFeedUriFromLink(link: string): string | null {
  if (!link) {
    return null;
  }

  try {
    const url = link.startsWith('http://') || link.startsWith('https://')
      ? new URL(link)
      : new URL(link, BSKY_WEB_BASE_URL);

    const feedParam = url.searchParams.get('feed');
    if (feedParam) {
      return decodeURIComponent(feedParam);
    }

    const segments = url.pathname.split('/').filter(Boolean);
    const atUriSegment = segments.find((segment) => segment.startsWith('at://'));
    if (atUriSegment) {
      return decodeURIComponent(atUriSegment);
    }

    const feedIndex = segments.indexOf('feed');
    if (feedIndex > 0 && feedIndex + 1 < segments.length) {
      const actorSegment = decodeURIComponent(segments[feedIndex - 1] ?? '');
      const rkeySegment = decodeURIComponent(segments[feedIndex + 1]);

      if (actorSegment) {
        return `at://${actorSegment}/app.bsky.feed.generator/${rkeySegment}`;
      }
    }
  } catch (error) {
    // Ignore malformed URLs
  }

  return null;
}
