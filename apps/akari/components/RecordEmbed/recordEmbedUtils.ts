import type { BlueskyEmbed, BlueskyRecord } from '@/bluesky-api';
import { isGifEmbedUri } from '@/utils/gifEmbed';

type RecordEmbedShape = BlueskyEmbed & {
  record: BlueskyRecord;
  media?: BlueskyEmbed;
};

export type VideoData = {
  videoUrl: string;
  thumbnailUrl: string | undefined;
  altText: string;
  aspectRatio: BlueskyEmbed['aspectRatio'];
};

export type ExternalEmbedData = {
  $type: 'app.bsky.embed.external#view';
  external: NonNullable<BlueskyEmbed['external']>;
};

/**
 * Walk the (potentially nested) record-embed chain and return the leaf
 * author + uri references, plus convenient pre-built hrefs.
 */
export function resolveQuotedRefs(embed: RecordEmbedShape) {
  // For recordWithMedia#view and other nested record shapes, the actual
  // quoted post lives at embed.record.record (or one level deeper). Walk
  // the chain so taps on quoted posts navigate to the correct uri.
  const quotedAuthor =
    embed.record.record?.record?.author ?? embed.record.record?.author ?? embed.record.author;
  const quotedUri =
    embed.record.record?.record?.uri ?? embed.record.record?.uri ?? embed.record.uri;
  const postActor = quotedAuthor?.handle;
  const postRKey = quotedUri?.split('/').pop();
  const postHref = postActor && postRKey ? `/profile/${postActor}/post/${postRKey}` : '#';
  const authorHref = postActor ? `/profile/${postActor}` : '#';
  return { postActor, postRKey, postHref, authorHref };
}

export function getQuotedText(embed: RecordEmbedShape): string {
  // Check multiple possible locations for the text content
  const recordValue =
    embed.record.record?.record?.value || embed.record.record?.value || embed.record.value;
  if (recordValue?.text) {
    return recordValue.text;
  }
  return '';
}

export function getImageData(embed: RecordEmbedShape) {
  const embedData = embed.record.embed;
  const embedsData = embed.record.embeds;

  if (embedData?.images && embedData.images.length > 0) {
    // Filter out video files, only show actual images (including GIFs)
    const imageFiles = embedData.images.filter(
      (img) => !img.image?.mimeType || !img.image.mimeType.startsWith('video/'),
    );
    const urls = imageFiles.map((img) => img.fullsize);
    const altTexts = imageFiles.map((img) => img.alt);
    return { urls, altTexts };
  }

  if (embedsData) {
    for (const embedItem of embedsData) {
      if (embedItem.images && embedItem.images.length > 0) {
        const imageFiles = embedItem.images.filter(
          (img) => !img.image?.mimeType || !img.image.mimeType.startsWith('video/'),
        );
        const urls = imageFiles.map((img) => img.fullsize);
        const altTexts = imageFiles.map((img) => img.alt);
        return { urls, altTexts };
      }
    }
  }

  return { urls: [] as string[], altTexts: [] as string[] };
}

export function getVideoData(
  embed: RecordEmbedShape,
  videoFallbackLabel: string,
): VideoData | null {
  // Check main embed first
  if (embed.record.embed) {
    // Handle Bluesky native video embeds (app.bsky.embed.video#view)
    if (embed.record.embed.$type === 'app.bsky.embed.video#view' && embed.record.embed.playlist) {
      return {
        videoUrl: embed.record.embed.playlist,
        thumbnailUrl: embed.record.embed.thumbnail,
        altText: embed.record.embed.alt || videoFallbackLabel,
        aspectRatio: embed.record.embed.aspectRatio,
      };
    }

    // Handle legacy video embeds (app.bsky.embed.video)
    if (embed.record.embed.video) {
      return {
        videoUrl: embed.record.embed.video.ref.$link,
        thumbnailUrl: embed.record.embed.video.ref.$link,
        altText: embed.record.embed.video.alt || videoFallbackLabel,
        aspectRatio: embed.record.embed.aspectRatio,
      };
    }

    // Handle record with media embeds that might contain video
    if (
      embed.record.embed.$type === 'app.bsky.embed.recordWithMedia#view' &&
      embed.record.embed.media
    ) {
      if (
        embed.record.embed.media.$type === 'app.bsky.embed.video#view' &&
        embed.record.embed.media.playlist
      ) {
        return {
          videoUrl: embed.record.embed.media.playlist,
          thumbnailUrl: embed.record.embed.media.thumbnail,
          altText: embed.record.embed.media.alt || videoFallbackLabel,
          aspectRatio: embed.record.embed.media.aspectRatio,
        };
      }
      if (embed.record.embed.media.video) {
        return {
          videoUrl: embed.record.embed.media.video.ref.$link,
          thumbnailUrl: embed.record.embed.media.video.ref.$link,
          altText: embed.record.embed.media.video.alt || videoFallbackLabel,
          aspectRatio: embed.record.embed.media.aspectRatio,
        };
      }
    }
  }

  // Check embeds array if main embed doesn't have video
  if (embed.record.embeds) {
    for (const embedItem of embed.record.embeds) {
      if (embedItem.$type === 'app.bsky.embed.video#view' && embedItem.playlist) {
        return {
          videoUrl: embedItem.playlist,
          thumbnailUrl: embedItem.thumbnail,
          altText: embedItem.alt || videoFallbackLabel,
          aspectRatio: embedItem.aspectRatio,
        };
      }
      if (embedItem.video) {
        return {
          videoUrl: embedItem.video.ref.$link,
          thumbnailUrl: embedItem.video.ref.$link,
          altText: embedItem.video.alt || videoFallbackLabel,
          aspectRatio: embedItem.aspectRatio,
        };
      }
    }
  }

  return null;
}

export function getExternalEmbed(embed: RecordEmbedShape): ExternalEmbedData | null {
  if (embed.record.embed?.external) {
    return {
      $type: 'app.bsky.embed.external#view',
      // Pass `thumb` through verbatim — `resolveExternalThumb` handles
      // both view-shape (string URL) and record-shape (blob ref) inputs.
      external: { ...embed.record.embed.external },
    };
  }
  if (embed.record.embeds) {
    for (const embedItem of embed.record.embeds) {
      if (embedItem.external) {
        return {
          $type: 'app.bsky.embed.external#view',
          external: { ...embedItem.external },
        };
      }
    }
  }
  return null;
}

export type EmbedKind = 'youtube' | 'gif' | 'externalVideo' | 'external' | null;

export function classifyExternalEmbed(uri: string | undefined): Exclude<EmbedKind, null> | 'external' {
  if (!uri) return 'external';
  if (uri.includes('youtube.com') || uri.includes('youtu.be')) return 'youtube';
  if (isGifEmbedUri(uri)) return 'gif';
  if (
    uri.includes('vimeo.com') ||
    uri.includes('dailymotion.com') ||
    uri.includes('twitch.tv') ||
    uri.includes('tiktok.com') ||
    uri.includes('.mp4') ||
    uri.includes('.mov') ||
    uri.includes('.avi') ||
    uri.includes('.webm')
  ) {
    return 'externalVideo';
  }
  return 'external';
}

export function hasNativeVideo(embed: RecordEmbedShape): boolean {
  return (
    embed.record.embed?.$type === 'app.bsky.embed.video#view' ||
    !!embed.record.embed?.video ||
    !!embed.record.embeds?.some((e) => e.$type === 'app.bsky.embed.video#view' || e.video)
  );
}

export type UnavailableKind = 'blocked' | 'notFound' | 'detached' | null;

/**
 * Detect "unavailable" record variants. The lexicon uses dedicated $type
 * values for each case — blocked author, deleted post, detached quote —
 * and any of them should render as a minimal placeholder.
 *
 * The $type can sit at one of several depths depending on whether the
 * post is a regular record embed or a recordWithMedia embed, so we probe
 * each plausible location.
 */
export function detectUnavailableKind(embed: RecordEmbedShape): UnavailableKind {
  const candidateTypes: (string | undefined)[] = [
    (embed as { $type?: string })?.$type,
    embed.record?.$type,
    (embed.record as { record?: { $type?: string } } | undefined)?.record?.$type,
    (embed.record as { record?: { record?: { $type?: string } } } | undefined)
      ?.record?.record?.$type,
  ];
  const recordType = candidateTypes.find(
    (s) =>
      typeof s === 'string' &&
      (s.includes('viewBlocked') || s.includes('viewNotFound') || s.includes('viewDetached')),
  );
  // The record viewer also gets populated when the relationship is
  // mutual or the user is doing the blocking — fall back to that as a
  // signal even when $type isn't carried through.
  const viewerOnRecord =
    (embed.record as { author?: { viewer?: { blocking?: string; blockedBy?: boolean } } })
      ?.author?.viewer ??
    (embed.record.record as { author?: { viewer?: { blocking?: string; blockedBy?: boolean } } } | undefined)
      ?.author?.viewer;
  const viewerImpliesBlocked =
    !!viewerOnRecord && (!!viewerOnRecord.blocking || !!viewerOnRecord.blockedBy);
  if (recordType) {
    if (recordType.includes('viewBlocked')) return 'blocked';
    if (recordType.includes('viewNotFound')) return 'notFound';
    return 'detached';
  }
  return viewerImpliesBlocked ? 'blocked' : null;
}

export function pickAuthorIdentifier(embed: RecordEmbedShape): string | undefined {
  // Use the shallowest identifier we can find so a blocked placeholder
  // can still resolve a handle/avatar.
  return (
    embed.record.author?.handle ||
    embed.record.author?.did ||
    embed.record.record?.author?.handle ||
    embed.record.record?.author?.did ||
    embed.record.record?.record?.author?.handle ||
    embed.record.record?.record?.author?.did
  );
}

export type RecordEmbedAuthor = {
  did: string | undefined;
  handle: string;
  displayName: string;
  avatar: string | undefined;
  verification: BlueskyEmbed['record'] extends { verification: infer V } ? V : unknown;
};

export function getViewerForRecord(embed: RecordEmbedShape) {
  return (
    embed.record.record?.record?.author?.viewer ||
    embed.record.record?.author?.viewer ||
    embed.record.author?.viewer
  );
}
