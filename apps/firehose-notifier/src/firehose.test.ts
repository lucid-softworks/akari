import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { Subscription } from './types.js';

type Handler = (event: unknown) => void;

const mockJetstreamInstances: MockJetstream[] = [];

class MockJetstream {
  public readonly onHandlers = new Map<string, Handler>();
  public readonly createHandlers = new Map<string, Handler>();
  public started = false;
  public closed = false;
  public readonly options: unknown;

  constructor(options: unknown) {
    this.options = options;
    mockJetstreamInstances.push(this);
  }

  on(event: string, handler: Handler) {
    this.onHandlers.set(event, handler);
  }

  onCreate(collection: string, handler: Handler) {
    this.createHandlers.set(collection, handler);
  }

  start() {
    this.started = true;
  }

  close() {
    this.closed = true;
  }
}

jest.mock('@skyware/jetstream', () => ({
  Jetstream: MockJetstream,
}));

import { FirehoseNotifier } from './firehose.js';

function makeStore(subs: Subscription[]) {
  const map = new Map<string, Subscription>();
  for (const sub of subs) {
    map.set(sub.did.toLowerCase(), sub);
  }
  return {
    get: jest.fn((did: string | null) => (did ? map.get(did.toLowerCase()) : undefined)),
    start: jest.fn(),
    stop: jest.fn(),
  };
}

type SentMessage = { title: string; body: string };

function makeNotifier() {
  return {
    send: jest.fn<(subscription: Subscription, message: SentMessage) => Promise<void>>(
      async () => {},
    ),
  };
}

describe('FirehoseNotifier', () => {
  let jetstream: MockJetstream;

  beforeEach(() => {
    mockJetstreamInstances.length = 0;
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function build(subs: Subscription[]) {
    const store = makeStore(subs);
    const notifier = makeNotifier();
    const service = new FirehoseNotifier(notifier as never, store as never);
    service.start();
    jetstream = mockJetstreamInstances[mockJetstreamInstances.length - 1];
    return { service, store, notifier };
  }

  it('configures jetstream with the watched collections and registers handlers on start', () => {
    const { service } = build([]);
    expect((jetstream.options as { wantedCollections: string[] }).wantedCollections).toEqual([
      'app.bsky.graph.follow',
      'app.bsky.feed.like',
      'app.bsky.feed.post',
      'app.bsky.feed.repost',
    ]);
    expect(jetstream.started).toBe(true);
    expect(jetstream.onHandlers.has('open')).toBe(true);
    expect(jetstream.onHandlers.has('close')).toBe(true);
    expect(jetstream.onHandlers.has('error')).toBe(true);
    expect(jetstream.createHandlers.size).toBe(4);

    // lifecycle log handlers run without error
    jetstream.onHandlers.get('open')!(undefined);
    jetstream.onHandlers.get('close')!(undefined);
    jetstream.onHandlers.get('error')!(new Error('boom'));
    jetstream.onHandlers.get('error')!('plain string error');

    service.stop();
    expect(jetstream.closed).toBe(true);
  });

  // FOLLOW
  it('notifies the followed subscriber on a follow event', async () => {
    const { store, notifier } = build([{ did: 'did:plc:target', tokens: ['t'] }]);
    const handler = jetstream.createHandlers.get('app.bsky.graph.follow')!;
    handler({ did: 'did:plc:follower', commit: { record: { subject: 'did:plc:target' } } });
    await Promise.resolve();

    expect(store.get).toHaveBeenCalledWith('did:plc:target');
    expect(notifier.send).toHaveBeenCalledTimes(1);
    const [, msg] = notifier.send.mock.calls[0];
    expect(msg.title).toBe('New follower');
    expect(msg.body).toContain('did:plc:follower');
  });

  it('ignores a follow event when there is no matching subscription', async () => {
    const { notifier } = build([]);
    jetstream.createHandlers.get('app.bsky.graph.follow')!({
      did: 'did:plc:follower',
      commit: { record: { subject: 'did:plc:nobody' } },
    });
    await Promise.resolve();
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it('ignores a self-follow event', async () => {
    const { notifier } = build([{ did: 'did:plc:self', tokens: ['t'] }]);
    jetstream.createHandlers.get('app.bsky.graph.follow')!({
      did: 'did:plc:self',
      commit: { record: { subject: 'did:plc:self' } },
    });
    await Promise.resolve();
    expect(notifier.send).not.toHaveBeenCalled();
  });

  // LIKE
  it('notifies on a like event', async () => {
    const { notifier } = build([{ did: 'did:plc:author', tokens: ['t'] }]);
    jetstream.createHandlers.get('app.bsky.feed.like')!({
      did: 'did:plc:liker',
      commit: { record: { subject: { uri: 'at://did:plc:author/app.bsky.feed.post/x', cid: 'cid1' } } },
    });
    await Promise.resolve();
    const [, msg] = notifier.send.mock.calls[0];
    expect(msg.title).toBe('New like');
  });

  it('ignores a self-like event', async () => {
    const { notifier } = build([{ did: 'did:plc:author', tokens: ['t'] }]);
    jetstream.createHandlers.get('app.bsky.feed.like')!({
      did: 'did:plc:author',
      commit: { record: { subject: { uri: 'at://did:plc:author/app.bsky.feed.post/x', cid: 'c' } } },
    });
    await Promise.resolve();
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it('ignores a like for an unknown subject', async () => {
    const { notifier } = build([]);
    jetstream.createHandlers.get('app.bsky.feed.like')!({
      did: 'did:plc:liker',
      commit: { record: { subject: { uri: 'at://did:plc:other/app.bsky.feed.post/x', cid: 'c' } } },
    });
    await Promise.resolve();
    expect(notifier.send).not.toHaveBeenCalled();
  });

  // REPOST
  it('notifies on a repost event', async () => {
    const { notifier } = build([{ did: 'did:plc:author', tokens: ['t'] }]);
    jetstream.createHandlers.get('app.bsky.feed.repost')!({
      did: 'did:plc:reposter',
      commit: { record: { subject: { uri: 'at://did:plc:author/app.bsky.feed.post/x', cid: 'c' } } },
    });
    await Promise.resolve();
    const [, msg] = notifier.send.mock.calls[0];
    expect(msg.title).toBe('New repost');
  });

  it('ignores a self-repost and unknown-subject repost', async () => {
    const { notifier } = build([{ did: 'did:plc:author', tokens: ['t'] }]);
    jetstream.createHandlers.get('app.bsky.feed.repost')!({
      did: 'did:plc:author',
      commit: { record: { subject: { uri: 'at://did:plc:author/app.bsky.feed.post/x', cid: 'c' } } },
    });
    jetstream.createHandlers.get('app.bsky.feed.repost')!({
      did: 'did:plc:reposter',
      commit: { record: { subject: { uri: 'at://did:plc:unknown/app.bsky.feed.post/x', cid: 'c' } } },
    });
    await Promise.resolve();
    expect(notifier.send).not.toHaveBeenCalled();
  });

  // REPLY (post)
  it('ignores a post event that is not a reply', async () => {
    const { notifier } = build([{ did: 'did:plc:author', tokens: ['t'] }]);
    jetstream.createHandlers.get('app.bsky.feed.post')!({
      did: 'did:plc:replier',
      commit: { collection: 'app.bsky.feed.post', rkey: 'r1', record: { text: 'hi' } },
    });
    await Promise.resolve();
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it('notifies the parent and root of a reply (deduped) with a text snippet', async () => {
    const { notifier } = build([
      { did: 'did:plc:parent', tokens: ['t'] },
      { did: 'did:plc:root', tokens: ['t'] },
    ]);
    jetstream.createHandlers.get('app.bsky.feed.post')!({
      did: 'did:plc:replier',
      commit: {
        collection: 'app.bsky.feed.post',
        rkey: 'r1',
        record: {
          text: 'hello there',
          reply: {
            parent: { uri: 'at://did:plc:parent/app.bsky.feed.post/p', cid: 'c' },
            root: { uri: 'at://did:plc:root/app.bsky.feed.post/rt', cid: 'c' },
          },
        },
      },
    });
    await Promise.resolve();
    expect(notifier.send).toHaveBeenCalledTimes(2);
    const [, msg] = notifier.send.mock.calls[0];
    expect(msg.title).toBe('New reply');
    expect(msg.body).toContain('hello there');
  });

  it('truncates long reply text in the notification body', async () => {
    const { notifier } = build([{ did: 'did:plc:parent', tokens: ['t'] }]);
    const longText = 'a'.repeat(200);
    jetstream.createHandlers.get('app.bsky.feed.post')!({
      did: 'did:plc:replier',
      commit: {
        collection: 'app.bsky.feed.post',
        rkey: 'r1',
        record: {
          text: longText,
          reply: { parent: { uri: 'at://did:plc:parent/app.bsky.feed.post/p', cid: 'c' } },
        },
      },
    });
    await Promise.resolve();
    const [, msg] = notifier.send.mock.calls[0];
    expect(msg.body).toContain('…');
    expect(msg.body.length).toBeLessThan(longText.length + 50);
  });

  it('uses the fallback body when a reply has no text', async () => {
    const { notifier } = build([{ did: 'did:plc:parent', tokens: ['t'] }]);
    jetstream.createHandlers.get('app.bsky.feed.post')!({
      did: 'did:plc:replier',
      commit: {
        collection: 'app.bsky.feed.post',
        rkey: 'r1',
        record: {
          reply: { parent: { uri: 'at://did:plc:parent/app.bsky.feed.post/p', cid: 'c' } },
        },
      },
    });
    await Promise.resolve();
    const [, msg] = notifier.send.mock.calls[0];
    expect(msg.body).toBe('did:plc:replier replied to your post');
  });

  it('skips a self-reply', async () => {
    const { notifier } = build([{ did: 'did:plc:author', tokens: ['t'] }]);
    jetstream.createHandlers.get('app.bsky.feed.post')!({
      did: 'did:plc:author',
      commit: {
        collection: 'app.bsky.feed.post',
        rkey: 'r1',
        record: {
          text: 'self reply',
          reply: { parent: { uri: 'at://did:plc:author/app.bsky.feed.post/p', cid: 'c' } },
        },
      },
    });
    await Promise.resolve();
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it('ignores a reply whose targets have no subscription', async () => {
    const { notifier } = build([]);
    jetstream.createHandlers.get('app.bsky.feed.post')!({
      did: 'did:plc:replier',
      commit: {
        collection: 'app.bsky.feed.post',
        rkey: 'r1',
        record: {
          text: 'hi',
          reply: { parent: { uri: 'at://did:plc:nobody/app.bsky.feed.post/p', cid: 'c' } },
        },
      },
    });
    await Promise.resolve();
    expect(notifier.send).not.toHaveBeenCalled();
  });
});
