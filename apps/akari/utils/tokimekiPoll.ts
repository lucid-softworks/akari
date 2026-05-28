/**
 * Tokimeki polls (`tech.tokimeki.poll.poll`) are attached to a post via an
 * `app.bsky.embed.external` whose `uri` is a link to Tokimeki's web viewer,
 * e.g. `https://poll.tokimeki.tech/p/<did>/<rkey>?options=4`. The poll record
 * itself lives at `at://<did>/tech.tokimeki.poll.poll/<rkey>`. These helpers
 * bridge the two so we can both render other clients' polls and create our
 * own in a form every client recognises.
 */

const POLL_COLLECTION = 'tech.tokimeki.poll.poll';
const POLL_HOST = 'poll.tokimeki.tech';

/** True if an external-embed uri points at a Tokimeki poll viewer. */
export function isTokimekiPollUrl(url: string): boolean {
  return /^https?:\/\/poll\.tokimeki\.tech\/p\//i.test(url);
}

/**
 * Turn a Tokimeki poll viewer URL into the poll record's at:// URI, or null
 * if it isn't one. Path shape: `/p/<did>/<rkey>`.
 */
export function pollUriFromEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes(POLL_HOST)) return null;
    const parts = parsed.pathname.split('/').filter(Boolean); // ['p', did, rkey]
    if (parts[0] !== 'p' || parts.length < 3) return null;
    const [, did, rkey] = parts;
    if (!did.startsWith('did:') || !rkey) return null;
    return `at://${did}/${POLL_COLLECTION}/${rkey}`;
  } catch {
    return null;
  }
}

/** Build the Tokimeki viewer URL for a poll record we just created. */
export function pollEmbedUrlFromRecord(pollUri: string, optionCount: number): string | null {
  const parts = pollUri.replace('at://', '').split('/'); // [did, collection, rkey]
  const did = parts[0];
  const rkey = parts[2];
  if (!did || !rkey) return null;
  return `https://${POLL_HOST}/p/${did}/${rkey}?options=${optionCount}`;
}
