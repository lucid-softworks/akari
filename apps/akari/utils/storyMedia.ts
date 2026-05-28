/**
 * Helpers for pulling a displayable image out of a "story" record. Flashes
 * (`blue.flashes.story.post`) puts the blob at `value.image`; Spark
 * (`so.sprk.story.post`) wraps it in an `so.sprk.media.*` union we don't
 * model. Rather than hard-code each shape, we walk the record value for the
 * first `image/*` blob, which works for both regardless of nesting.
 */

export type StoryImageBlob = {
  cid: string;
  mimeType?: string;
  size?: number;
};

type AtBlob = {
  $type?: string;
  ref?: { $link?: string } | string;
  mimeType?: string;
  size?: number;
};

function blobCid(ref: AtBlob['ref']): string | undefined {
  if (typeof ref === 'string') return ref;
  if (ref && typeof ref === 'object' && typeof ref.$link === 'string') return ref.$link;
  return undefined;
}

function asBlob(value: unknown): AtBlob | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as AtBlob;
  if (v.$type !== 'blob') return undefined;
  return blobCid(v.ref) ? v : undefined;
}

/**
 * Depth-first search for the first `image/*` blob anywhere in a record
 * value. Returns its CID + mime/size, or undefined (e.g. a video-only Spark
 * story, which the image Lightbox can't show).
 */
export function findStoryImageBlob(value: unknown): StoryImageBlob | undefined {
  const stack: unknown[] = [value];
  while (stack.length > 0) {
    const node = stack.pop();
    const blob = asBlob(node);
    if (blob && (!blob.mimeType || blob.mimeType.startsWith('image/'))) {
      return { cid: blobCid(blob.ref) as string, mimeType: blob.mimeType, size: blob.size };
    }
    if (node && typeof node === 'object') {
      for (const child of Object.values(node as Record<string, unknown>)) {
        if (child && typeof child === 'object') stack.push(child);
      }
    }
  }
  return undefined;
}

/** PDS-direct blob URL (`com.atproto.sync.getBlob`) for a story image. */
export function buildStoryBlobUrl(pdsUrl: string, did: string, cid: string): string {
  return `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}
