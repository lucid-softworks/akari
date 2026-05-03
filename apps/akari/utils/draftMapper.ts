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

export type ComposerDraftState = {
  id: string;
  text: string;
  images: DraftAttachedImage[];
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

/**
 * Encodes the composer state as a single-post draft. The lexicon supports
 * multi-post threads (up to 100 entries) but we ship a one-post composer
 * today — wider thread support will plug in here later.
 */
export function composerStateToDraft(input: {
  text: string;
  images: DraftAttachedImage[];
  controls: PostControls;
  deviceId?: string;
  deviceName?: string;
}): BlueskyDraft {
  const post: BlueskyDraftPost = { text: input.text };
  if (input.images.length > 0) {
    post.embedImages = input.images.map((img) => ({
      localRef: { path: img.uri },
      alt: img.alt || undefined,
    }));
  }
  const draft: BlueskyDraft = { posts: [post] };
  const allow = controlsToThreadgateAllow(input.controls.replyAllow);
  if (allow !== undefined) draft.threadgateAllow = allow;
  const postgate = controlsToPostgateRules(input.controls.allowQuote);
  if (postgate !== undefined) draft.postgateEmbeddingRules = postgate;
  if (input.deviceId) draft.deviceId = input.deviceId;
  if (input.deviceName) draft.deviceName = input.deviceName;
  return draft;
}

/**
 * Decodes a draftView back into the composer's local state. Only the
 * first post is read today (the composer is single-post). Embed metadata
 * for video / external / record is dropped here — when we build thread
 * publishing this should grow to handle the full shape.
 */
export function draftViewToComposerState(view: BlueskyDraftView): ComposerDraftState {
  const first = view.draft.posts[0];
  const images: DraftAttachedImage[] =
    first?.embedImages?.map((img) => ({
      uri: img.localRef.path,
      alt: img.alt ?? '',
      mimeType: 'image/jpeg',
    })) ?? [];
  const controls: PostControls = {
    replyAllow: threadgateAllowToControls(view.draft.threadgateAllow),
    allowQuote: postgateRulesToAllowQuote(view.draft.postgateEmbeddingRules),
  };
  return {
    id: view.id,
    text: first?.text ?? '',
    images,
    controls,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}

/** Default that callers can spread when nothing has been edited yet. */
export const DEFAULT_DRAFT_CONTROLS = DEFAULT_POST_CONTROLS;
