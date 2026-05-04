import type { BlueskyMutedWord, BlueskyPostView } from '@/bluesky-api';

type MutedWordTarget = 'content' | 'tag';

export type MutedWordsFilterOptions = {
  /**
   * DIDs of accounts the viewer follows. Used to honor the
   * `actorTarget: 'exclude-following'` rule — if a muted word has that scope,
   * it doesn't apply to posts authored by anyone in this set.
   *
   * Optional; if omitted, `exclude-following` rules apply to everyone.
   */
  followingDids?: ReadonlySet<string>;
  /**
   * "Now" reference for evaluating `expiresAt`. Tests pin this so they don't
   * depend on wall-clock time. Defaults to `Date.now()`.
   */
  now?: number;
};

/**
 * Drop expired entries up-front so each post only walks the live ones.
 */
function activeMutedWords(
  mutedWords: readonly BlueskyMutedWord[],
  now: number,
): BlueskyMutedWord[] {
  return mutedWords.filter((entry) => {
    if (!entry.expiresAt) return true;
    const expires = Date.parse(entry.expiresAt);
    return Number.isNaN(expires) ? true : expires > now;
  });
}

function postMatchesEntry(
  post: BlueskyPostView,
  entry: BlueskyMutedWord,
  options: MutedWordsFilterOptions,
): boolean {
  if (entry.actorTarget === 'exclude-following') {
    if (options.followingDids?.has(post.author.did)) return false;
  }

  const targets: MutedWordTarget[] = entry.targets?.length
    ? entry.targets
    : ['content', 'tag'];

  const value = entry.value.trim();
  if (!value) return false;

  if (targets.includes('content')) {
    const text = extractText(post).toLowerCase();
    if (text.includes(value.toLowerCase())) return true;
  }

  if (targets.includes('tag')) {
    // The lexicon treats values with a leading `#` as a hashtag; strip it for
    // comparison since post tag facets are stored without the `#`.
    const normalisedValue = value.replace(/^#+/, '').toLowerCase();
    if (!normalisedValue) return false;
    for (const tag of extractTags(post)) {
      if (tag.toLowerCase() === normalisedValue) return true;
    }
  }

  return false;
}

function extractText(post: BlueskyPostView): string {
  const record = post.record as { text?: unknown } | undefined;
  return typeof record?.text === 'string' ? record.text : '';
}

function extractTags(post: BlueskyPostView): string[] {
  const record = post.record as
    | {
        facets?: Array<{ features?: Array<Record<string, unknown>> }>;
        tags?: unknown;
      }
    | undefined;

  const facetTags: string[] = [];
  for (const facet of record?.facets ?? []) {
    for (const feature of facet.features ?? []) {
      if (feature?.['$type'] === 'app.bsky.richtext.facet#tag') {
        const tag = feature['tag'];
        if (typeof tag === 'string') facetTags.push(tag);
      }
    }
  }

  // Older clients also wrote a top-level `tags` array on the record; honor it
  // for completeness.
  const recordTags = Array.isArray(record?.tags)
    ? record.tags.filter((t): t is string => typeof t === 'string')
    : [];

  return [...facetTags, ...recordTags];
}

/**
 * Pure predicate: does `post` match any active muted-word rule?
 * Exposed for unit testing and reuse outside of feed renderers.
 */
export function isPostMuted(
  post: BlueskyPostView,
  mutedWords: readonly BlueskyMutedWord[],
  options: MutedWordsFilterOptions = {},
): boolean {
  if (mutedWords.length === 0) return false;
  const now = options.now ?? Date.now();
  const active = activeMutedWords(mutedWords, now);
  if (active.length === 0) return false;
  return active.some((entry) => postMatchesEntry(post, entry, options));
}

/**
 * Drop posts that match any active muted-word rule. Returns a new array.
 */
export function filterMutedPosts<T extends BlueskyPostView>(
  posts: readonly T[],
  mutedWords: readonly BlueskyMutedWord[],
  options: MutedWordsFilterOptions = {},
): T[] {
  if (mutedWords.length === 0) return posts.slice();
  const now = options.now ?? Date.now();
  const active = activeMutedWords(mutedWords, now);
  if (active.length === 0) return posts.slice();
  return posts.filter((post) => !active.some((entry) => postMatchesEntry(post, entry, { ...options, now })));
}
