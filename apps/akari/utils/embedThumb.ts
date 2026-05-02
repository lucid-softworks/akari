/**
 * Resolves an external embed's `thumb` field to a usable URL.
 *
 * In the `app.bsky.embed.external#view` shape the thumb is a fully-resolved
 * URL string. In the underlying record shape it's a blob ref (CID). The
 * codebase's types model the record shape, but at runtime we receive views,
 * so we accept both forms here.
 */
export function resolveExternalThumb(
  thumb: unknown,
): string | undefined {
  if (!thumb) return undefined;
  if (typeof thumb === 'string') return thumb;
  if (typeof thumb === 'object' && thumb !== null) {
    const t = thumb as { ref?: { $link?: string } };
    return t.ref?.$link;
  }
  return undefined;
}

/**
 * Builds the thumbnail URL for a YouTube video, given its video id.
 *
 * Uses `hqdefault.jpg` instead of `maxresdefault.jpg` because the latter is
 * only generated for sufficiently high-resolution uploads — many older or
 * smaller videos return 404 for it.
 */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Extract a YouTube video id from an arbitrary URL. Returns null if the URL
 * is not a recognised YouTube link.
 */
export function matchYouTubeId(uri: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = uri.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Vimeo doesn't expose a public no-API thumbnail URL pattern (you'd need to
 * call their oEmbed endpoint), so we fall back to no thumbnail for now.
 * Returning null here keeps the call sites simple.
 */
export function vimeoThumbnailFor(_uri: string): string | null {
  return null;
}
