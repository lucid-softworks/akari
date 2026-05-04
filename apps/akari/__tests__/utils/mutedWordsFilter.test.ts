import type { BlueskyMutedWord, BlueskyPostView } from '@/bluesky-api';

import { filterMutedPosts, isPostMuted } from '@/utils/mutedWordsFilter';

function makePost(
  overrides: Partial<BlueskyPostView> & {
    text?: string;
    tags?: string[];
    facetTags?: string[];
    authorDid?: string;
  } = {},
): BlueskyPostView {
  const { text, tags, facetTags, authorDid, ...rest } = overrides;
  const facets = facetTags?.map((tag) => ({
    features: [{ $type: 'app.bsky.richtext.facet#tag', tag }],
  }));
  return {
    uri: 'at://example/post/1',
    cid: 'cid1',
    author: {
      did: authorDid ?? 'did:plc:author',
      handle: 'author.test',
    },
    record: {
      $type: 'app.bsky.feed.post',
      text: text ?? '',
      createdAt: '2026-01-01T00:00:00Z',
      ...(facets ? { facets } : {}),
      ...(tags ? { tags } : {}),
    },
    indexedAt: '2026-01-01T00:00:00Z',
    ...rest,
  } as unknown as BlueskyPostView;
}

const word = (
  value: string,
  targets: ('content' | 'tag')[] = ['content', 'tag'],
  extras: Partial<BlueskyMutedWord> = {},
): BlueskyMutedWord => ({ value, targets, ...extras });

describe('isPostMuted', () => {
  it('returns false when there are no muted words', () => {
    expect(isPostMuted(makePost({ text: 'anything goes' }), [])).toBe(false);
  });

  it('matches a content word case-insensitively', () => {
    const post = makePost({ text: 'I love Pineapple Pizza' });
    expect(isPostMuted(post, [word('pineapple', ['content'])])).toBe(true);
  });

  it('does not match against text when target is tag-only', () => {
    const post = makePost({ text: 'Pineapple is divisive', facetTags: ['anime'] });
    expect(isPostMuted(post, [word('pineapple', ['tag'])])).toBe(false);
  });

  it('matches a tag from a richtext facet', () => {
    const post = makePost({ text: 'just watching tv', facetTags: ['SpoilerSeason'] });
    expect(isPostMuted(post, [word('spoilerseason', ['tag'])])).toBe(true);
  });

  it('matches a tag from the legacy top-level tags array', () => {
    const post = makePost({ text: 'archived post', tags: ['oldhashtag'] });
    expect(isPostMuted(post, [word('oldhashtag', ['tag'])])).toBe(true);
  });

  it('strips a leading # from the muted value when matching tags', () => {
    const post = makePost({ text: 'tagged', facetTags: ['cooking'] });
    expect(isPostMuted(post, [word('#cooking', ['tag'])])).toBe(true);
  });

  it('treats an empty value as a no-op', () => {
    const post = makePost({ text: 'literally any text' });
    expect(isPostMuted(post, [word('   ', ['content'])])).toBe(false);
  });

  it('ignores entries that have already expired', () => {
    const past = '2025-01-01T00:00:00Z';
    const post = makePost({ text: 'still talking about pineapple' });
    expect(
      isPostMuted(
        post,
        [word('pineapple', ['content'], { expiresAt: past })],
        { now: Date.parse('2026-06-01T00:00:00Z') },
      ),
    ).toBe(false);
  });

  it('honors entries that have not yet expired', () => {
    const future = '2027-01-01T00:00:00Z';
    const post = makePost({ text: 'still talking about pineapple' });
    expect(
      isPostMuted(
        post,
        [word('pineapple', ['content'], { expiresAt: future })],
        { now: Date.parse('2026-06-01T00:00:00Z') },
      ),
    ).toBe(true);
  });

  it('skips posts authored by following when actorTarget is exclude-following', () => {
    const post = makePost({ text: 'pineapple again', authorDid: 'did:plc:friend' });
    expect(
      isPostMuted(
        post,
        [word('pineapple', ['content'], { actorTarget: 'exclude-following' })],
        { followingDids: new Set(['did:plc:friend']) },
      ),
    ).toBe(false);
  });

  it('still mutes non-followed authors when actorTarget is exclude-following', () => {
    const post = makePost({ text: 'pineapple again', authorDid: 'did:plc:stranger' });
    expect(
      isPostMuted(
        post,
        [word('pineapple', ['content'], { actorTarget: 'exclude-following' })],
        { followingDids: new Set(['did:plc:friend']) },
      ),
    ).toBe(true);
  });
});

describe('filterMutedPosts', () => {
  it('returns the original posts unchanged when no muted words exist', () => {
    const posts = [makePost({ text: 'a' }), makePost({ text: 'b' })];
    const out = filterMutedPosts(posts, []);
    expect(out).toEqual(posts);
    expect(out).not.toBe(posts);
  });

  it('drops every post that matches at least one rule', () => {
    const posts = [
      makePost({ text: 'pineapple wins' }),
      makePost({ text: 'fine, both' }),
      makePost({ text: 'mango all the way' }),
    ];
    const out = filterMutedPosts(posts, [word('pineapple', ['content'])]);
    expect(out.map((p) => (p.record as { text: string }).text)).toEqual([
      'fine, both',
      'mango all the way',
    ]);
  });

  it('keeps posts when all muted entries are expired', () => {
    const past = '2025-01-01T00:00:00Z';
    const posts = [makePost({ text: 'pineapple' })];
    const out = filterMutedPosts(
      posts,
      [word('pineapple', ['content'], { expiresAt: past })],
      { now: Date.parse('2026-06-01T00:00:00Z') },
    );
    expect(out).toHaveLength(1);
  });
});
