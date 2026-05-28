import type { BlueskyEmbed } from '@/bluesky-api';

/**
 * What the composer is going to publish:
 *   - 'standard'   : manual single post or hand-built thread (current behavior).
 *   - 'autothread' : one big text body that we auto-split into a thread when
 *                    the user posts; chars beyond the per-post limit roll over
 *                    into the next chunk.
 *   - 'longform'   : hand the body off to leaflet.pub instead of posting to
 *                    atproto's feed lexicon, for posts that don't belong
 *                    chopped into 300-char pieces at all.
 */
export type ComposeMode = 'standard' | 'autothread' | 'longform';

export type PostFacet = {
  index: { byteStart: number; byteEnd: number };
  features: { $type: string; uri?: string; tag?: string; did?: string }[];
};

export type PostPreview = {
  text?: string;
  author: {
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  embed?: BlueskyEmbed;
  embeds?: BlueskyEmbed[];
  facets?: PostFacet[];
};

export type QuotedPost = PostPreview & {
  uri: string;
  cid: string;
  indexedAt?: string;
};

export type QuotedImage = { url: string; aspectRatio?: number };

export type AttachedImage = {
  uri: string;
  alt: string;
  mimeType: string;
  tenorId?: string;
};

export type AttachedVideo = {
  uri: string;
  mimeType: string;
  alt: string;
  aspectRatio?: { width: number; height: number };
  /** Set once the transcode pipeline finishes. The post button stays
   *  disabled until this lands. */
  blob?: { $type: 'blob'; ref: { $link: string }; mimeType: string; size: number };
  /** UI state during upload + transcode. `phase` drives the progress
   *  row's label / spinner. */
  upload?:
    | { phase: 'authorizing' }
    | { phase: 'uploading'; progress: number }
    | { phase: 'processing'; progress?: number }
    | { phase: 'error'; message: string };
};

/** A poll being attached to the post (root post only). The post text is
 *  the question; these are the answer options + how long voting stays open. */
export type PollDraft = {
  options: string[];
  durationHours: number;
};

export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 4;

export const EMPTY_POLL_DRAFT: PollDraft = {
  options: ['', ''],
  durationHours: 24,
};

/** One leaf in a thread compose. The composer holds an array of these
 *  and posts them sequentially with reply chaining when published. */
export type ThreadPost = {
  text: string;
  attachedImages: AttachedImage[];
  attachedVideo: AttachedVideo | null;
};

export const EMPTY_THREAD_POST: ThreadPost = {
  text: '',
  attachedImages: [],
  attachedVideo: null,
};

export const MAX_POST_CHARACTERS = 300;
