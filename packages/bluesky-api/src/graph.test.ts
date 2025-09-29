import { BlueskyGraph } from './graph';
import type { BlueskySession } from './types';

describe('BlueskyGraph', () => {
  const createSession = (overrides: Partial<BlueskySession> = {}): BlueskySession =>
    ({
      handle: 'user.test',
      did: 'did:plc:123',
      active: true,
      accessJwt: 'jwt',
      refreshJwt: 'refresh',
      ...overrides,
    } as BlueskySession);

  class TestGraph extends BlueskyGraph {
    public calls: {
      endpoint: string;
      accessJwt: string;
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      };
    }[] = [];

    public responses: unknown[] = [];

    constructor() {
      super('https://pds.example');
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      } = {},
    ): Promise<T> {
      const session = this.requireSession();
      this.calls.push({ endpoint, accessJwt: session.accessJwt, options });
      return (this.responses.shift() as T) ?? (undefined as T);
    }
  }

  it('follows and unfollows users through repo record endpoints', async () => {
    const graph = new TestGraph();
    graph.responses = [{ uri: 'follow-record' }, { success: true }];

    const followSession = createSession();
    const unfollowSession = createSession({ accessJwt: 'unfollow-token' });
    graph.useSession(followSession);
    const followResult = await graph.followUser('did:example:alice');
    graph.useSession(unfollowSession);
    const unfollowResult = await graph.unfollowUser('at://follow/123');

    expect(followResult).toEqual({ uri: 'follow-record' });
    expect(unfollowResult).toEqual({ success: true });

    expect(graph.calls[0]).toMatchObject({
      endpoint: '/com.atproto.repo.createRecord',
      accessJwt: followSession.accessJwt,
      options: {
        method: 'POST',
        body: {
          repo: 'self',
          collection: 'app.bsky.graph.follow',
          record: expect.objectContaining({ subject: 'did:example:alice' }),
        },
      },
    });
    const followRecord = graph.calls[0].options.body as { record: Record<string, unknown> };
    expect(typeof followRecord.record.createdAt).toBe('string');

    expect(graph.calls[1]).toEqual({
      endpoint: '/com.atproto.repo.deleteRecord',
      accessJwt: unfollowSession.accessJwt,
      options: {
        method: 'POST',
        body: {
          uri: 'at://follow/123',
        },
      },
    });
  });

  it('blocks and unblocks actors', async () => {
    const graph = new TestGraph();
    graph.responses = [{ block: true }, { success: true }];

    const blockSession = createSession();
    const unblockSession = createSession({ accessJwt: 'unblock-token' });
    graph.useSession(blockSession);
    const blockResult = await graph.blockUser('did:example:bob');
    graph.useSession(unblockSession);
    const unblockResult = await graph.unblockUser('at://block/1');

    expect(blockResult).toEqual({ block: true });
    expect(unblockResult).toEqual({ success: true });

    expect(graph.calls[0].endpoint).toBe('/com.atproto.repo.createRecord');
    expect(graph.calls[0].options.body).toMatchObject({
      repo: 'self',
      collection: 'app.bsky.graph.block',
      record: expect.objectContaining({ subject: 'did:example:bob' }),
    });
    expect(graph.calls[1]).toEqual({
      endpoint: '/com.atproto.repo.deleteRecord',
      accessJwt: unblockSession.accessJwt,
      options: {
        method: 'POST',
        body: {
          uri: 'at://block/1',
        },
      },
    });
  });

  it('mutes users, lists, and threads via dedicated endpoints', async () => {
    const graph = new TestGraph();
    graph.responses = [{}, {}, {}];

    const session = createSession();
    graph.useSession(session);
    await graph.muteUser('did:example:carol');
    await graph.muteActorList('at://list/1');
    await graph.muteThread('at://post/thread');

    expect(graph.calls).toHaveLength(3);
    expect(graph.calls[0]).toEqual({
      endpoint: '/app.bsky.graph.muteActor',
      accessJwt: session.accessJwt,
      options: {
        method: 'POST',
        body: { actor: 'did:example:carol' },
      },
    });
    expect(graph.calls[1]).toEqual({
      endpoint: '/app.bsky.graph.muteActorList',
      accessJwt: session.accessJwt,
      options: {
        method: 'POST',
        body: { list: 'at://list/1' },
      },
    });
    expect(graph.calls[2]).toEqual({
      endpoint: '/app.bsky.graph.muteThread',
      accessJwt: session.accessJwt,
      options: {
        method: 'POST',
        body: { root: 'at://post/thread' },
      },
    });
  });

  it('unmutes users using the unmute endpoint', async () => {
    const graph = new TestGraph();
    graph.responses = [{}];

    const session = createSession();
    graph.useSession(session);
    await graph.unmuteUser('did:example:dan');

    expect(graph.calls).toEqual([
      {
        endpoint: '/app.bsky.graph.unmuteActor',
        accessJwt: session.accessJwt,
        options: {
          method: 'POST',
          body: { actor: 'did:example:dan' },
        },
      },
    ]);
  });
});
