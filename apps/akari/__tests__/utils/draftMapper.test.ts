import type { BlueskyDraftView } from '@/bluesky-api';
import {
  composerStateToDraft,
  draftViewToComposerState,
  type ComposerDraftState,
  type DraftPostEntry,
} from '@/utils/draftMapper';
import type { PostControls } from '@/utils/postControls';

const EVERYONE_ALLOW_QUOTE: PostControls = {
  replyAllow: { type: 'everyone' },
  allowQuote: true,
};

describe('composerStateToDraft', () => {
  it('maps a single text-only post with no gating', () => {
    const draft = composerStateToDraft({
      posts: [{ text: 'hello world', images: [] }],
      controls: EVERYONE_ALLOW_QUOTE,
    });
    expect(draft).toEqual({ posts: [{ text: 'hello world' }] });
    // `everyone` reply + allowQuote omit gate fields entirely.
    expect(draft.threadgateAllow).toBeUndefined();
    expect(draft.postgateEmbeddingRules).toBeUndefined();
    expect(draft.deviceId).toBeUndefined();
    expect(draft.deviceName).toBeUndefined();
  });

  it('seeds a single blank post when posts is empty', () => {
    const draft = composerStateToDraft({
      posts: [],
      controls: EVERYONE_ALLOW_QUOTE,
    });
    expect(draft.posts).toEqual([{ text: '' }]);
  });

  it('maps multiple thread entries preserving order', () => {
    const posts: DraftPostEntry[] = [
      { text: 'first', images: [] },
      { text: 'second', images: [] },
      { text: 'third', images: [] },
    ];
    const draft = composerStateToDraft({ posts, controls: EVERYONE_ALLOW_QUOTE });
    expect(draft.posts).toEqual([{ text: 'first' }, { text: 'second' }, { text: 'third' }]);
  });

  it('maps attached images into embedImages with alt text', () => {
    const draft = composerStateToDraft({
      posts: [
        {
          text: 'with images',
          images: [
            { uri: 'file:///a.jpg', alt: 'an A', mimeType: 'image/jpeg' },
            { uri: 'file:///b.png', alt: 'a B', mimeType: 'image/png' },
          ],
        },
      ],
      controls: EVERYONE_ALLOW_QUOTE,
    });
    expect(draft.posts[0].embedImages).toEqual([
      { localRef: { path: 'file:///a.jpg' }, alt: 'an A' },
      { localRef: { path: 'file:///b.png' }, alt: 'a B' },
    ]);
  });

  it('omits alt when an image has empty alt text', () => {
    const draft = composerStateToDraft({
      posts: [{ text: 't', images: [{ uri: 'file:///c.jpg', alt: '', mimeType: 'image/jpeg' }] }],
      controls: EVERYONE_ALLOW_QUOTE,
    });
    expect(draft.posts[0].embedImages).toEqual([{ localRef: { path: 'file:///c.jpg' }, alt: undefined }]);
  });

  it('does not set embedImages when there are no images', () => {
    const draft = composerStateToDraft({
      posts: [{ text: 't', images: [] }],
      controls: EVERYONE_ALLOW_QUOTE,
    });
    expect('embedImages' in draft.posts[0]).toBe(false);
  });

  it('emits an empty threadgate allow array for `nobody`', () => {
    const draft = composerStateToDraft({
      posts: [{ text: 't', images: [] }],
      controls: { replyAllow: { type: 'nobody' }, allowQuote: true },
    });
    expect(draft.threadgateAllow).toEqual([]);
  });

  it('maps limited reply rules (mention/following/follower/lists)', () => {
    const draft = composerStateToDraft({
      posts: [{ text: 't', images: [] }],
      controls: {
        replyAllow: {
          type: 'limited',
          mention: true,
          following: true,
          follower: true,
          listUris: ['at://list/1', 'at://list/2'],
        },
        allowQuote: true,
      },
    });
    expect(draft.threadgateAllow).toEqual([
      { $type: 'app.bsky.feed.threadgate#mentionRule' },
      { $type: 'app.bsky.feed.threadgate#followingRule' },
      { $type: 'app.bsky.feed.threadgate#followerRule' },
      { $type: 'app.bsky.feed.threadgate#listRule', list: 'at://list/1' },
      { $type: 'app.bsky.feed.threadgate#listRule', list: 'at://list/2' },
    ]);
  });

  it('emits an empty allow array for limited with no flags set', () => {
    const draft = composerStateToDraft({
      posts: [{ text: 't', images: [] }],
      controls: { replyAllow: { type: 'limited' }, allowQuote: true },
    });
    expect(draft.threadgateAllow).toEqual([]);
  });

  it('only includes the rules that are enabled', () => {
    const draft = composerStateToDraft({
      posts: [{ text: 't', images: [] }],
      controls: { replyAllow: { type: 'limited', following: true }, allowQuote: true },
    });
    expect(draft.threadgateAllow).toEqual([{ $type: 'app.bsky.feed.threadgate#followingRule' }]);
  });

  it('adds a postgate disable rule when quotes are not allowed', () => {
    const draft = composerStateToDraft({
      posts: [{ text: 't', images: [] }],
      controls: { replyAllow: { type: 'everyone' }, allowQuote: false },
    });
    expect(draft.postgateEmbeddingRules).toEqual([{ $type: 'app.bsky.feed.postgate#disableRule' }]);
  });

  it('includes deviceId and deviceName when provided', () => {
    const draft = composerStateToDraft({
      posts: [{ text: 't', images: [] }],
      controls: EVERYONE_ALLOW_QUOTE,
      deviceId: 'device-123',
      deviceName: 'My Phone',
    });
    expect(draft.deviceId).toBe('device-123');
    expect(draft.deviceName).toBe('My Phone');
  });
});

describe('draftViewToComposerState', () => {
  const baseView = (overrides: Partial<BlueskyDraftView['draft']> = {}): BlueskyDraftView => ({
    id: 'draft-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    draft: {
      posts: [{ text: 'hello' }],
      ...overrides,
    },
  });

  it('decodes id, timestamps, posts, and default controls', () => {
    const state = draftViewToComposerState(baseView());
    expect(state).toEqual<ComposerDraftState>({
      id: 'draft-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      posts: [{ text: 'hello', images: [] }],
      controls: { replyAllow: { type: 'everyone' }, allowQuote: true },
    });
  });

  it('seeds a single blank post when the draft has no posts', () => {
    const state = draftViewToComposerState(baseView({ posts: [] }));
    expect(state.posts).toEqual([{ text: '', images: [] }]);
  });

  it('defaults missing post text to empty string', () => {
    const state = draftViewToComposerState(
      baseView({ posts: [{ text: undefined as unknown as string }] }),
    );
    expect(state.posts[0].text).toBe('');
  });

  it('decodes embedded images, defaulting missing alt to empty string', () => {
    const state = draftViewToComposerState(
      baseView({
        posts: [
          {
            text: 'images',
            embedImages: [
              { localRef: { path: 'file:///a.jpg' }, alt: 'alt A' },
              { localRef: { path: 'file:///b.jpg' } },
            ],
          },
        ],
      }),
    );
    expect(state.posts[0].images).toEqual([
      { uri: 'file:///a.jpg', alt: 'alt A', mimeType: 'image/jpeg' },
      { uri: 'file:///b.jpg', alt: '', mimeType: 'image/jpeg' },
    ]);
  });

  it('maps an empty threadgate allow array to `nobody`', () => {
    const state = draftViewToComposerState(baseView({ threadgateAllow: [] }));
    expect(state.controls.replyAllow).toEqual({ type: 'nobody' });
  });

  it('maps threadgate rules to limited controls (all rule types)', () => {
    const state = draftViewToComposerState(
      baseView({
        threadgateAllow: [
          { $type: 'app.bsky.feed.threadgate#mentionRule' },
          { $type: 'app.bsky.feed.threadgate#followingRule' },
          { $type: 'app.bsky.feed.threadgate#followerRule' },
          { $type: 'app.bsky.feed.threadgate#listRule', list: 'at://list/1' },
          { $type: 'app.bsky.feed.threadgate#listRule', list: 'at://list/2' },
        ],
      }),
    );
    expect(state.controls.replyAllow).toEqual({
      type: 'limited',
      mention: true,
      following: true,
      follower: true,
      listUris: ['at://list/1', 'at://list/2'],
    });
  });

  it('omits listUris when no list rules are present', () => {
    const state = draftViewToComposerState(
      baseView({ threadgateAllow: [{ $type: 'app.bsky.feed.threadgate#mentionRule' }] }),
    );
    expect(state.controls.replyAllow).toEqual({ type: 'limited', mention: true });
  });

  it('reads allowQuote false when a postgate disable rule is present', () => {
    const state = draftViewToComposerState(
      baseView({ postgateEmbeddingRules: [{ $type: 'app.bsky.feed.postgate#disableRule' }] }),
    );
    expect(state.controls.allowQuote).toBe(false);
  });

  it('reads allowQuote true when postgate rules is an empty array', () => {
    const state = draftViewToComposerState(baseView({ postgateEmbeddingRules: [] }));
    expect(state.controls.allowQuote).toBe(true);
  });
});

describe('round-trip', () => {
  it('preserves text, images, and controls through encode then decode', () => {
    const posts: DraftPostEntry[] = [
      {
        text: 'first',
        images: [{ uri: 'file:///a.jpg', alt: 'A', mimeType: 'image/jpeg' }],
      },
      { text: 'second', images: [] },
    ];
    const controls: PostControls = {
      replyAllow: { type: 'limited', following: true, listUris: ['at://list/x'] },
      allowQuote: false,
    };
    const draft = composerStateToDraft({ posts, controls });
    const view: BlueskyDraftView = {
      id: 'rt-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      draft,
    };
    const state = draftViewToComposerState(view);
    expect(state.posts).toEqual(posts);
    expect(state.controls).toEqual(controls);
  });
});
