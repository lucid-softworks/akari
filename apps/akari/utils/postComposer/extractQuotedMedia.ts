import type { BlueskyEmbed } from '@/bluesky-api';

import type { QuotedImage, QuotedPost } from './types';

export function extractQuotedMedia(quote?: QuotedPost): {
  images: QuotedImage[];
  video: { thumb: string; aspectRatio?: number } | null;
  external: { thumb: string } | null;
} {
  if (!quote) {
    return { images: [], video: null, external: null };
  }

  const candidates: (BlueskyEmbed | undefined)[] = [
    quote.embed,
    ...(quote.embeds ?? []),
  ];

  const images: QuotedImage[] = [];
  let video: { thumb: string; aspectRatio?: number } | null = null;
  let external: { thumb: string } | null = null;

  const ratioFrom = (ar?: { width: number; height: number }) =>
    ar && ar.width > 0 && ar.height > 0 ? ar.width / ar.height : undefined;

  const visit = (embed?: BlueskyEmbed | null) => {
    if (!embed) return;

    if (
      (embed.$type === 'app.bsky.embed.images#view' || embed.$type === 'app.bsky.embed.images') &&
      embed.images
    ) {
      for (const img of embed.images) {
        const url = img.thumb || img.fullsize;
        const isVideoFile = img.image?.mimeType?.startsWith('video/');
        if (url && !isVideoFile && images.length < 4) {
          images.push({ url, aspectRatio: ratioFrom(img.aspectRatio) });
        }
      }
    }

    if (embed.$type === 'app.bsky.embed.video#view' && (embed.thumbnail || embed.playlist)) {
      const thumb = embed.thumbnail;
      if (thumb && !video) {
        video = { thumb, aspectRatio: ratioFrom(embed.aspectRatio) };
      }
    }

    if (embed.$type?.includes('app.bsky.embed.external') && embed.external?.thumb?.ref?.$link) {
      external = { thumb: embed.external.thumb.ref.$link };
    }

    // recordWithMedia: descend into media
    if (embed.media) visit(embed.media as unknown as BlueskyEmbed);
  };

  for (const c of candidates) visit(c);

  return { images, video, external };
}
