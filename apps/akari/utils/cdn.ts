/**
 * CDN URL rewriting.
 *
 * The Bluesky AppView returns image URLs that point at `cdn.bsky.app` (the
 * official image CDN — separate from the AppView itself). When the user
 * picks a different CDN (e.g. `cdn.blueat.net`) we swap the host on every
 * matching URL we render.
 *
 * The path layout is identical across mirrors
 * (`/img/<size>/plain/<did>/<cid>@<format>`), so a host-only swap is enough
 * — we never have to touch the path.
 */

import { readAppViewSettings } from '@/hooks/useAppViewSettings';
import { resolveCdnHost } from '@/utils/appView';

const CDN_HOSTS_TO_REWRITE = new Set([
  'cdn.bsky.app',
  'cdn.bsky.social',
  'public.cdn.bsky.app',
]);

/**
 * Returns the user's effective CDN base URL, or `undefined` when no
 * override is active (URLs flow through unchanged in that case).
 */
export function readCdnHost(): string | undefined {
  return resolveCdnHost(readAppViewSettings());
}

/**
 * Rewrite `url` to use the user's configured CDN host, but only when the URL
 * points at a known Bluesky CDN. Leaves all other URLs (Tenor GIFs, YouTube
 * thumbnails, TMDb posters, local file:// URIs, etc.) untouched.
 *
 * Safe to apply unconditionally to any `<Image>` source — non-matching URLs
 * round-trip without modification.
 */
export function rewriteCdnUrl(url: string | null | undefined): string | undefined {
  if (!url) return url ?? undefined;
  const host = readCdnHost();
  if (!host) return url;
  for (const candidate of CDN_HOSTS_TO_REWRITE) {
    const prefix = `https://${candidate}`;
    if (url.startsWith(prefix)) {
      return host + url.slice(prefix.length);
    }
  }
  return url;
}

/**
 * Build a `cdn.bsky.app`-shaped image URL and route it through the rewrite,
 * for the rare call sites that synthesise CDN URLs from a blob ref (e.g. the
 * notifications screen synthesising a feed-thumbnail URL from a post embed).
 */
export function cdnImageUrl(args: {
  size: 'avatar' | 'banner' | 'feed_thumbnail' | 'feed_fullsize';
  did: string;
  blobRef: string;
  format?: 'jpeg' | 'png';
}): string {
  const format = args.format ?? 'jpeg';
  return rewriteCdnUrl(
    `https://cdn.bsky.app/img/${args.size}/plain/${args.did}/${args.blobRef}@${format}`,
  )!;
}
