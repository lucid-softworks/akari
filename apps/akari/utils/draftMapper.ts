import type {
  BlueskyDraft,
  BlueskyDraftPost,
  BlueskyDraftPostgateRule,
  BlueskyDraftThreadgateRule,
  BlueskyDraftView,
} from '@/bluesky-api';
import type { PostControls, ReplyAllow } from '@/utils/postControls';
import { DEFAULT_POST_CONTROLS } from '@/utils/postControls';

export type DraftAttachedImage = {
  uri: string;
  alt: string;
  mimeType: string;
  tenorId?: string;
};

/** One leaf in a thread draft. The composer rebuilds these into its
 *  ThreadPost shape on load. */
export type DraftPostEntry = {
  text: string;
  images: DraftAttachedImage[];
};

export type ComposerDraftState = {
  id: string;
  posts: DraftPostEntry[];
  controls: PostControls;
  createdAt: string;
  updatedAt: string;
};

const TG = {
  mention: 'app.bsky.feed.threadgate#mentionRule',
  following: 'app.bsky.feed.threadgate#followingRule',
  follower: 'app.bsky.feed.threadgate#followerRule',
  list: 'app.bsky.feed.threadgate#listRule',
} as const;

const POSTGATE_DISABLE = 'app.bsky.feed.postgate#disableRule' as const;

function controlsToThreadgateAllow(
  replyAllow: ReplyAllow,
): BlueskyDraftThreadgateRule[] | undefined {
  // `everyone` → omit the field entirely (no threadgate at all).
  if (replyAllow.type === 'everyone') return undefined;
  // `nobody` → empty array (preserved by the server as "deny all").
  if (replyAllow.type === 'nobody') return [];
  const rules: BlueskyDraftThreadgateRule[] = [];
  if (replyAllow.mention) rules.push({ $type: TG.mention });
  if (replyAllow.following) rules.push({ $type: TG.following });
  if (replyAllow.follower) rules.push({ $type: TG.follower });
  for (const list of replyAllow.listUris ?? []) {
    rules.push({ $type: TG.list, list });
  }
  return rules;
}

function threadgateAllowToControls(
  rules: BlueskyDraftThreadgateRule[] | undefined,
): ReplyAllow {
  if (rules === undefined) return { type: 'everyone' };
  if (rules.length === 0) return { type: 'nobody' };
  const limited: Extract<ReplyAllow, { type: 'limited' }> = { type: 'limited' };
  const lists: string[] = [];
  for (const r of rules) {
    if (r.$type === TG.mention) limited.mention = true;
    else if (r.$type === TG.following) limited.following = true;
    else if (r.$type === TG.follower) limited.follower = true;
    else if (r.$type === TG.list) lists.push(r.list);
  }
  if (lists.length > 0) limited.listUris = lists;
  return limited;
}

function controlsToPostgateRules(
  allowQuote: boolean,
): BlueskyDraftPostgateRule[] | undefined {
  // Default (allow quotes) → no rule needed.
  return allowQuote ? undefined : [{ $type: POSTGATE_DISABLE }];
}

function postgateRulesToAllowQuote(
  rules: BlueskyDraftPostgateRule[] | undefined,
): boolean {
  if (!rules) return true;
  return !rules.some((r) => r.$type === POSTGATE_DISABLE);
}

function entryToDraftPost(entry: DraftPostEntry): BlueskyDraftPost {
  const post: BlueskyDraftPost = { text: entry.text };
  if (entry.images.length > 0) {
    post.embedImages = entry.images.map((img) => ({
      localRef: { path: img.uri },
      alt: img.alt || undefined,
    }));
  }
  return post;
}

function draftPostToEntry(post: BlueskyDraftPost): DraftPostEntry {
  const images: DraftAttachedImage[] =
    post.embedImages?.map((img) => ({
      uri: img.localRef.path,
      alt: img.alt ?? '',
      mimeType: 'image/jpeg',
    })) ?? [];
  return { text: post.text ?? '', images };
}

/**
 * Encodes a thread of composer posts as a Bluesky draft. The lexicon
 * caps `posts` at 100 entries, so we trust the caller hasn't blown
 * past that.
 *
 * Threadgate / postgate are tracked at the draft level (one set of
 * rules applies to the whole thread, since they only attach to the
 * root post on publish).
 */
export function composerStateToDraft(input: {
  posts: DraftPostEntry[];
  controls: PostControls;
  deviceId?: string;
  deviceName?: string;
}): BlueskyDraft {
  // The lexicon requires `posts.length >= 1`. If the caller hands us an
  // empty array (shouldn't happen), seed with one blank post so the
  // server accepts the draft.
  const entries = input.posts.length > 0 ? input.posts : [{ text: '', images: [] }];
  const draft: BlueskyDraft = { posts: entries.map(entryToDraftPost) };
  const allow = controlsToThreadgateAllow(input.controls.replyAllow);
  if (allow !== undefined) draft.threadgateAllow = allow;
  const postgate = controlsToPostgateRules(input.controls.allowQuote);
  if (postgate !== undefined) draft.postgateEmbeddingRules = postgate;
  if (input.deviceId) draft.deviceId = input.deviceId;
  if (input.deviceName) draft.deviceName = input.deviceName;
  return draft;
}

/**
 * Decodes a server draftView back into the composer's local state.
 * Embed metadata for video / external / record is dropped here — wire
 * those in alongside their composer support.
 */
export function draftViewToComposerState(view: BlueskyDraftView): ComposerDraftState {
  const posts =
    view.draft.posts.length > 0
      ? view.draft.posts.map(draftPostToEntry)
      : [{ text: '', images: [] }];
  const controls: PostControls = {
    replyAllow: threadgateAllowToControls(view.draft.threadgateAllow),
    allowQuote: postgateRulesToAllowQuote(view.draft.postgateEmbeddingRules),
  };
  return {
    id: view.id,
    posts,
    controls,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}

/** Default that callers can spread when nothing has been edited yet. */
export const DEFAULT_DRAFT_CONTROLS = DEFAULT_POST_CONTROLS;
