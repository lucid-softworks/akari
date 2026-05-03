/**
 * Reply / quote controls for a post.
 *
 * - `replyAllow`: who is allowed to reply.
 *     - `everyone`  → no threadgate (anyone can reply)
 *     - `nobody`    → empty allow array (nobody can reply)
 *     - `limited`   → some combination of mention / following / follower /
 *                      list rules.
 * - `allowQuote`: whether the post can be quoted.
 *
 * Default value mirrors atproto's "no gate" baseline: anyone can reply,
 * anyone can quote.
 */
export type ReplyAllow =
  | { type: 'everyone' }
  | { type: 'nobody' }
  | {
      type: 'limited';
      mention?: boolean;
      following?: boolean;
      follower?: boolean;
      listUris?: string[];
    };

export type PostControls = {
  replyAllow: ReplyAllow;
  allowQuote: boolean;
};

export const DEFAULT_POST_CONTROLS: PostControls = {
  replyAllow: { type: 'everyone' },
  allowQuote: true,
};

/** Compact label for the controls button: "Anyone can reply", etc. */
export function describePostControls(
  controls: PostControls,
  t: (key: string) => string,
): string {
  if (controls.replyAllow.type === 'everyone' && controls.allowQuote) {
    return t('post.controls.everyoneReply');
  }
  if (controls.replyAllow.type === 'nobody') {
    return t('post.controls.nobodyReply');
  }
  if (controls.replyAllow.type === 'limited') {
    const parts: string[] = [];
    if (controls.replyAllow.mention) parts.push(t('post.controls.mentioned'));
    if (controls.replyAllow.following) parts.push(t('post.controls.following'));
    if (controls.replyAllow.follower) parts.push(t('post.controls.followers'));
    if (controls.replyAllow.listUris && controls.replyAllow.listUris.length > 0) {
      parts.push(t('post.controls.lists'));
    }
    if (parts.length === 0) return t('post.controls.nobodyReply');
    return parts.join(', ');
  }
  return controls.allowQuote
    ? t('post.controls.everyoneReply')
    : t('post.controls.everyoneReplyNoQuote');
}
