/**
 * Bluesky's own moderation labeler. Always included with `;redact` so the
 * AppView applies its hide labels even when the user hasn't explicitly
 * subscribed to any labeler — same baseline the official app uses.
 */
const BSKY_MODERATION_LABELER_DID = 'did:plc:ar7c4by46qjdydhdevvrndac';

/**
 * Builds an `atproto-accept-labelers` header from a list of labeler DIDs.
 * Pass the DIDs the user has subscribed to via `app.bsky.actor.defs#labelersPref`;
 * Bluesky's moderation labeler is always prepended so a fresh account
 * still gets basic moderation coverage. Returns `undefined` when the list
 * is empty (caller can spread the result unconditionally).
 *
 * Used by every endpoint that returns labels — posts, profiles, threads.
 * Without this header, post / profile `labels` come back as basically
 * empty arrays.
 */
export function buildAcceptLabelersHeader(
  subscribedDids: readonly string[] = [],
): { 'atproto-accept-labelers': string } | undefined {
  const seen = new Set<string>();
  const parts: string[] = [];
  parts.push(`${BSKY_MODERATION_LABELER_DID};redact`);
  seen.add(BSKY_MODERATION_LABELER_DID);
  for (const did of subscribedDids) {
    if (!did || seen.has(did)) continue;
    seen.add(did);
    parts.push(did);
  }
  if (parts.length === 0) return undefined;
  return { 'atproto-accept-labelers': parts.join(', ') };
}
