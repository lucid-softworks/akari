import type { BlueskyFeedItem, BlueskyMutedWord, BlueskyPostView } from '@/bluesky-api';
import type { FeedFilters } from '@/hooks/useFeedFilters';
import { filterFeedItems, shouldHideFeedItem } from '@/utils/feedFilters';

const NO_FILTERS: FeedFilters = {
  hideReplies: false,
  hideReposts: false,
  hideQuotes: false,
  hideEngaged: false,
  onlyFollowing: false,
  onlyMutuals: false,
};

const makePost = (over: Partial<BlueskyPostView> = {}): BlueskyPostView =>
  ({
    uri: 'at://post',
    cid: 'cid',
    author: { did: 'did:plc:a', handle: 'a.test' },
    record: { $type: 'app.bsky.feed.post', text: 'hi', createdAt: '2024-01-01' },
    indexedAt: '2024-01-01',
    ...over,
  }) as BlueskyPostView;

const makeItem = (over: Partial<BlueskyFeedItem> = {}): BlueskyFeedItem =>
  ({ post: makePost(), ...over }) as BlueskyFeedItem;

describe('shouldHideFeedItem', () => {
  it('keeps everything with no filters active', () => {
    expect(shouldHideFeedItem(makeItem(), NO_FILTERS)).toBe(false);
  });

  it('hides reposts when hideReposts is set', () => {
    const item = makeItem({ reason: { $type: 'app.bsky.feed.defs#reasonRepost' } as never });
    expect(shouldHideFeedItem(item, { ...NO_FILTERS, hideReposts: true })).toBe(true);
    expect(shouldHideFeedItem(item, NO_FILTERS)).toBe(false);
  });

  it('hides replies when hideReplies is set', () => {
    const item = makeItem({
      post: makePost({ record: { reply: { parent: {}, root: {} } } as never }),
    });
    expect(shouldHideFeedItem(item, { ...NO_FILTERS, hideReplies: true })).toBe(true);
  });

  it('respects applyHideReplies: false', () => {
    const item = makeItem({
      post: makePost({ record: { reply: { parent: {}, root: {} } } as never }),
    });
    expect(
      shouldHideFeedItem(item, { ...NO_FILTERS, hideReplies: true }, { applyHideReplies: false }),
    ).toBe(false);
  });

  it('hides quote posts when hideQuotes is set', () => {
    const item = makeItem({
      post: makePost({ embed: { $type: 'app.bsky.embed.record#view' } as never }),
    });
    expect(shouldHideFeedItem(item, { ...NO_FILTERS, hideQuotes: true })).toBe(true);
  });

  it('hides posts the viewer engaged with when hideEngaged is set', () => {
    const item = makeItem({
      post: makePost({ viewer: { like: 'at://like' } as never }),
    });
    expect(shouldHideFeedItem(item, { ...NO_FILTERS, hideEngaged: true })).toBe(true);
  });

  it('hides non-followed authors under onlyFollowing', () => {
    const stranger = makeItem();
    const followed = makeItem({
      post: makePost({
        author: { did: 'did:plc:a', handle: 'a.test', viewer: { following: 'at://f' } } as never,
      }),
    });
    expect(shouldHideFeedItem(stranger, { ...NO_FILTERS, onlyFollowing: true })).toBe(true);
    expect(shouldHideFeedItem(followed, { ...NO_FILTERS, onlyFollowing: true })).toBe(false);
  });

  it('hides non-mutuals under onlyMutuals', () => {
    const oneWay = makeItem({
      post: makePost({
        author: { did: 'did:plc:a', handle: 'a.test', viewer: { following: 'at://f' } } as never,
      }),
    });
    const mutual = makeItem({
      post: makePost({
        author: {
          did: 'did:plc:a',
          handle: 'a.test',
          viewer: { following: 'at://f', followedBy: 'at://b' },
        } as never,
      }),
    });
    expect(shouldHideFeedItem(oneWay, { ...NO_FILTERS, onlyMutuals: true })).toBe(true);
    expect(shouldHideFeedItem(mutual, { ...NO_FILTERS, onlyMutuals: true })).toBe(false);
  });

  it('hides posts outside the like-count bounds', () => {
    const item = makeItem({ post: makePost({ likeCount: 5 }) });
    expect(shouldHideFeedItem(item, { ...NO_FILTERS, minLikes: 10 })).toBe(true);
    expect(shouldHideFeedItem(item, { ...NO_FILTERS, maxLikes: 3 })).toBe(true);
    expect(shouldHideFeedItem(item, { ...NO_FILTERS, minLikes: 1, maxLikes: 10 })).toBe(false);
  });

  it('does not filter on counts that are missing from the post', () => {
    const item = makeItem({ post: makePost({ likeCount: undefined }) });
    expect(shouldHideFeedItem(item, { ...NO_FILTERS, minLikes: 10 })).toBe(false);
  });

  it('applies bookmark-count bounds only when exposed', () => {
    const withBookmarks = makeItem({ post: makePost({ bookmarkCount: 2 } as never) });
    const without = makeItem();
    expect(shouldHideFeedItem(withBookmarks, { ...NO_FILTERS, minBookmarks: 5 })).toBe(true);
    expect(shouldHideFeedItem(without, { ...NO_FILTERS, minBookmarks: 5 })).toBe(false);
  });
});

describe('filterFeedItems', () => {
  const mutedWords: BlueskyMutedWord[] = [{ value: 'spoiler', targets: ['content'] } as never];

  it('drops muted-word posts and hidden items', () => {
    const clean = makeItem({ post: makePost({ uri: 'at://clean' }) });
    const muted = makeItem({
      post: makePost({
        uri: 'at://muted',
        record: { text: 'big spoiler ahead', createdAt: '2024-01-01' } as never,
      }),
    });
    const result = filterFeedItems([clean, muted], NO_FILTERS, mutedWords);
    expect(result).toEqual([clean]);
  });

  it('keeps everything when nothing matches', () => {
    const items = [makeItem(), makeItem()];
    expect(filterFeedItems(items, NO_FILTERS, [])).toHaveLength(2);
  });
});
