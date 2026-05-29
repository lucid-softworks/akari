import { BlueskyGraph } from './graph';
import type {
  BlueskyBlocksResponse,
  BlueskyCreateRecordResponse,
  BlueskyFollowRecordsResponse,
  BlueskyFollowsResponse,
  BlueskyListBlocksResponse,
  BlueskyListMutesResponse,
  BlueskyListResponse,
  BlueskyListsResponse,
  BlueskyMutesResponse,
} from './types';

describe('BlueskyGraph (coverage)', () => {
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
      accessJwt: string,
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      } = {},
    ): Promise<T> {
      this.calls.push({ endpoint, accessJwt, options });
      return (this.responses.shift() as T) ?? (undefined as T);
    }
  }

  it('mutes and unmutes an actor list via dedicated endpoints', async () => {
    const graph = new TestGraph();
    graph.responses = [{ ok: 1 }, { ok: 2 }];

    const muteResult = await graph.muteActorList('jwt', 'at://list/1');
    const unmuteResult = await graph.unmuteActorList('jwt', 'at://list/1');

    expect(muteResult).toEqual({ ok: 1 });
    expect(unmuteResult).toEqual({ ok: 2 });

    expect(graph.calls[0]).toEqual({
      endpoint: '/app.bsky.graph.muteActorList',
      accessJwt: 'jwt',
      options: { method: 'POST', body: { list: 'at://list/1' } },
    });
    expect(graph.calls[1]).toEqual({
      endpoint: '/app.bsky.graph.unmuteActorList',
      accessJwt: 'jwt',
      options: { method: 'POST', body: { list: 'at://list/1' } },
    });
  });

  it('blocks an actor list by creating a listblock record', async () => {
    const graph = new TestGraph();
    const response = { uri: 'at://me/app.bsky.graph.listblock/1', cid: 'cid' } as BlueskyCreateRecordResponse;
    graph.responses = [response];

    const result = await graph.blockActorList('jwt', 'did:example:me', 'at://list/1');

    expect(result).toEqual(response);
    expect(graph.calls[0]).toMatchObject({
      endpoint: '/com.atproto.repo.createRecord',
      accessJwt: 'jwt',
      options: {
        method: 'POST',
        body: {
          repo: 'did:example:me',
          collection: 'app.bsky.graph.listblock',
          record: expect.objectContaining({
            $type: 'app.bsky.graph.listblock',
            subject: 'at://list/1',
          }),
        },
      },
    });
    const body = graph.calls[0].options.body as { record: Record<string, unknown> };
    expect(typeof body.record.createdAt).toBe('string');
  });

  it('unblocks an actor list by deleting the parsed listblock record', async () => {
    const graph = new TestGraph();
    graph.responses = [{ success: true }];

    const result = await graph.unblockActorList(
      'jwt',
      'at://did:example:me/app.bsky.graph.listblock/abc',
    );

    expect(result).toEqual({ success: true });
    expect(graph.calls[0]).toEqual({
      endpoint: '/com.atproto.repo.deleteRecord',
      accessJwt: 'jwt',
      options: {
        method: 'POST',
        body: {
          repo: 'did:example:me',
          collection: 'app.bsky.graph.listblock',
          rkey: 'abc',
        },
      },
    });
  });

  it('throws on an invalid AT URI when unblocking an actor list', async () => {
    const graph = new TestGraph();
    await expect(graph.unblockActorList('jwt', 'not-an-at-uri')).rejects.toThrow(
      'Invalid AT URI: not-an-at-uri',
    );
  });

  it('fetches mutes with default limit and no cursor', async () => {
    const graph = new TestGraph();
    const response = { mutes: [] } as unknown as BlueskyMutesResponse;
    graph.responses = [response];

    const result = await graph.getMutes('jwt');

    expect(result).toEqual(response);
    expect(graph.calls[0]).toEqual({
      endpoint: '/app.bsky.graph.getMutes',
      accessJwt: 'jwt',
      options: { params: { limit: '50' } },
    });
  });

  it('fetches mutes with explicit limit and cursor', async () => {
    const graph = new TestGraph();
    graph.responses = [{ mutes: [] }];

    await graph.getMutes('jwt', 10, 'cur');

    expect(graph.calls[0].options.params).toEqual({ limit: '10', cursor: 'cur' });
  });

  it('fetches blocks with default and explicit params', async () => {
    const graph = new TestGraph();
    const response = { blocks: [] } as unknown as BlueskyBlocksResponse;
    graph.responses = [response, { blocks: [] }];

    const result = await graph.getBlocks('jwt');
    await graph.getBlocks('jwt', 5, 'next');

    expect(result).toEqual(response);
    expect(graph.calls[0]).toEqual({
      endpoint: '/app.bsky.graph.getBlocks',
      accessJwt: 'jwt',
      options: { params: { limit: '50' } },
    });
    expect(graph.calls[1].options.params).toEqual({ limit: '5', cursor: 'next' });
  });

  it('fetches follows for an actor with default and explicit params', async () => {
    const graph = new TestGraph();
    const response = { follows: [] } as unknown as BlueskyFollowsResponse;
    graph.responses = [response, { follows: [] }];

    const result = await graph.getFollows('jwt', 'did:example:alice');
    await graph.getFollows('jwt', 'did:example:alice', 25, 'page2');

    expect(result).toEqual(response);
    expect(graph.calls[0]).toEqual({
      endpoint: '/app.bsky.graph.getFollows',
      accessJwt: 'jwt',
      options: { params: { actor: 'did:example:alice', limit: '100' } },
    });
    expect(graph.calls[1].options.params).toEqual({
      actor: 'did:example:alice',
      limit: '25',
      cursor: 'page2',
    });
  });

  it('lists raw follow records for a repo', async () => {
    const graph = new TestGraph();
    const response = { records: [] } as unknown as BlueskyFollowRecordsResponse;
    graph.responses = [response, { records: [] }];

    const result = await graph.listFollowRecords('jwt', 'did:example:me');
    await graph.listFollowRecords('jwt', 'did:example:me', 50, 'cur');

    expect(result).toEqual(response);
    expect(graph.calls[0]).toEqual({
      endpoint: '/com.atproto.repo.listRecords',
      accessJwt: 'jwt',
      options: {
        params: {
          repo: 'did:example:me',
          collection: 'app.bsky.graph.follow',
          limit: '100',
        },
      },
    });
    expect(graph.calls[1].options.params).toEqual({
      repo: 'did:example:me',
      collection: 'app.bsky.graph.follow',
      limit: '50',
      cursor: 'cur',
    });
  });

  it('fetches list mutes with default and explicit params', async () => {
    const graph = new TestGraph();
    const response = { lists: [] } as unknown as BlueskyListMutesResponse;
    graph.responses = [response, { lists: [] }];

    const result = await graph.getListMutes('jwt');
    await graph.getListMutes('jwt', 20, 'cur');

    expect(result).toEqual(response);
    expect(graph.calls[0]).toEqual({
      endpoint: '/app.bsky.graph.getListMutes',
      accessJwt: 'jwt',
      options: { params: { limit: '50' } },
    });
    expect(graph.calls[1].options.params).toEqual({ limit: '20', cursor: 'cur' });
  });

  it('fetches list blocks with default and explicit params', async () => {
    const graph = new TestGraph();
    const response = { lists: [] } as unknown as BlueskyListBlocksResponse;
    graph.responses = [response, { lists: [] }];

    const result = await graph.getListBlocks('jwt');
    await graph.getListBlocks('jwt', 15, 'cur');

    expect(result).toEqual(response);
    expect(graph.calls[0]).toEqual({
      endpoint: '/app.bsky.graph.getListBlocks',
      accessJwt: 'jwt',
      options: { params: { limit: '50' } },
    });
    expect(graph.calls[1].options.params).toEqual({ limit: '15', cursor: 'cur' });
  });

  it('gets lists curated by an actor with default and explicit params', async () => {
    const graph = new TestGraph();
    const response = { lists: [] } as unknown as BlueskyListsResponse;
    graph.responses = [response, { lists: [] }];

    const result = await graph.getLists('jwt', 'did:example:alice');
    await graph.getLists('jwt', 'did:example:alice', 30, 'cur');

    expect(result).toEqual(response);
    expect(graph.calls[0]).toEqual({
      endpoint: '/app.bsky.graph.getLists',
      accessJwt: 'jwt',
      options: { params: { actor: 'did:example:alice', limit: '50' } },
    });
    expect(graph.calls[1].options.params).toEqual({
      actor: 'did:example:alice',
      limit: '30',
      cursor: 'cur',
    });
  });

  it('gets a single list view with default and explicit params', async () => {
    const graph = new TestGraph();
    const response = { list: {}, items: [] } as unknown as BlueskyListResponse;
    graph.responses = [response, { list: {}, items: [] }];

    const result = await graph.getList('jwt', 'at://list/1');
    await graph.getList('jwt', 'at://list/1', 40, 'cur');

    expect(result).toEqual(response);
    expect(graph.calls[0]).toEqual({
      endpoint: '/app.bsky.graph.getList',
      accessJwt: 'jwt',
      options: { params: { list: 'at://list/1', limit: '50' } },
    });
    expect(graph.calls[1].options.params).toEqual({
      list: 'at://list/1',
      limit: '40',
      cursor: 'cur',
    });
  });

  it('creates a list with a description', async () => {
    const graph = new TestGraph();
    const response = { uri: 'at://me/app.bsky.graph.list/1', cid: 'cid' } as BlueskyCreateRecordResponse;
    graph.responses = [response];

    const result = await graph.createList('jwt', 'did:example:me', {
      name: 'Friends',
      purpose: 'app.bsky.graph.defs#curatelist',
      description: 'My pals',
    });

    expect(result).toEqual(response);
    expect(graph.calls[0]).toMatchObject({
      endpoint: '/com.atproto.repo.createRecord',
      accessJwt: 'jwt',
      options: {
        method: 'POST',
        body: {
          repo: 'did:example:me',
          collection: 'app.bsky.graph.list',
          record: expect.objectContaining({
            $type: 'app.bsky.graph.list',
            name: 'Friends',
            purpose: 'app.bsky.graph.defs#curatelist',
            description: 'My pals',
          }),
        },
      },
    });
    const body = graph.calls[0].options.body as { record: Record<string, unknown> };
    expect(typeof body.record.createdAt).toBe('string');
  });

  it('creates a list without a description', async () => {
    const graph = new TestGraph();
    graph.responses = [{ uri: 'at://me/app.bsky.graph.list/2', cid: 'cid' }];

    await graph.createList('jwt', 'did:example:me', {
      name: 'Blocked',
      purpose: 'app.bsky.graph.defs#modlist',
    });

    const body = graph.calls[0].options.body as { record: Record<string, unknown> };
    expect(body.record.description).toBeUndefined();
    expect(body.record.purpose).toBe('app.bsky.graph.defs#modlist');
  });

  it('adds an actor to a list by creating a listitem record', async () => {
    const graph = new TestGraph();
    const response = { uri: 'at://me/app.bsky.graph.listitem/1', cid: 'cid' } as BlueskyCreateRecordResponse;
    graph.responses = [response];

    const result = await graph.addToList('jwt', 'did:example:me', 'at://list/1', 'did:example:bob');

    expect(result).toEqual(response);
    expect(graph.calls[0]).toMatchObject({
      endpoint: '/com.atproto.repo.createRecord',
      accessJwt: 'jwt',
      options: {
        method: 'POST',
        body: {
          repo: 'did:example:me',
          collection: 'app.bsky.graph.listitem',
          record: expect.objectContaining({
            $type: 'app.bsky.graph.listitem',
            subject: 'did:example:bob',
            list: 'at://list/1',
          }),
        },
      },
    });
    const body = graph.calls[0].options.body as { record: Record<string, unknown> };
    expect(typeof body.record.createdAt).toBe('string');
  });

  it('removes a list membership by deleting its listitem record', async () => {
    const graph = new TestGraph();
    graph.responses = [{ success: true }];

    const result = await graph.removeFromList('jwt', 'at://me/app.bsky.graph.listitem/1');

    expect(result).toEqual({ success: true });
    expect(graph.calls[0]).toEqual({
      endpoint: '/com.atproto.repo.deleteRecord',
      accessJwt: 'jwt',
      options: {
        method: 'POST',
        body: { uri: 'at://me/app.bsky.graph.listitem/1' },
      },
    });
  });
});
