import { BlueskyPoll, type PollCreateRecordResponse } from './poll';

describe('BlueskyPoll', () => {
  class TestPoll extends BlueskyPoll {
    public authCalls: {
      endpoint: string;
      accessJwt: string;
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      };
    }[] = [];

    public requestCalls: {
      endpoint: string;
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
      this.authCalls.push({ endpoint, accessJwt, options });
      return (this.responses.shift() as T) ?? (undefined as T);
    }

    protected async makeRequest<T>(
      endpoint: string,
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      } = {},
    ): Promise<T> {
      this.requestCalls.push({ endpoint, options });
      return (this.responses.shift() as T) ?? (undefined as T);
    }
  }

  describe('createPoll', () => {
    it('creates a tech.tokimeki.poll.poll record and returns the response', async () => {
      const poll = new TestPoll();
      const response: PollCreateRecordResponse = { uri: 'at://poll/1', cid: 'cidpoll' };
      poll.responses = [response];

      const result = await poll.createPoll('jwt', 'did:example:me', {
        options: ['A', 'B', 'C'],
        endsAt: '2026-06-01T00:00:00.000Z',
      });

      expect(result).toBe(response);
      expect(poll.authCalls).toHaveLength(1);
      const call = poll.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(call.accessJwt).toBe('jwt');
      expect(call.options.method).toBe('POST');

      const body = call.options.body as {
        repo: string;
        collection: string;
        record: Record<string, unknown>;
      };
      expect(body.repo).toBe('did:example:me');
      expect(body.collection).toBe('tech.tokimeki.poll.poll');
      expect(body.record).toMatchObject({
        $type: 'tech.tokimeki.poll.poll',
        options: ['A', 'B', 'C'],
        endsAt: '2026-06-01T00:00:00.000Z',
      });
      expect(typeof body.record.createdAt).toBe('string');
      expect(body.record).not.toHaveProperty('subject');
    });
  });

  describe('createVote', () => {
    it('creates a tech.tokimeki.poll.vote record referencing the poll by strongRef', async () => {
      const poll = new TestPoll();
      const response: PollCreateRecordResponse = { uri: 'at://vote/1', cid: 'cidvote' };
      poll.responses = [response];

      const result = await poll.createVote('jwt', 'did:example:me', {
        poll: { uri: 'at://poll/1', cid: 'cidpoll' },
        optionIndex: 2,
      });

      expect(result).toBe(response);
      expect(poll.authCalls).toHaveLength(1);
      const call = poll.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(call.accessJwt).toBe('jwt');
      expect(call.options.method).toBe('POST');

      const body = call.options.body as {
        repo: string;
        collection: string;
        record: Record<string, unknown>;
      };
      expect(body.repo).toBe('did:example:me');
      expect(body.collection).toBe('tech.tokimeki.poll.vote');
      expect(body.record).toMatchObject({
        $type: 'tech.tokimeki.poll.vote',
        poll: { $type: 'com.atproto.repo.strongRef', uri: 'at://poll/1', cid: 'cidpoll' },
        optionIndex: 2,
      });
      expect(typeof body.record.createdAt).toBe('string');
    });

    it('preserves optionIndex 0', async () => {
      const poll = new TestPoll();
      poll.responses = [{ uri: 'at://vote/2', cid: 'cidvote2' }];

      await poll.createVote('jwt', 'did:example:me', {
        poll: { uri: 'at://poll/2', cid: 'cidpoll2' },
        optionIndex: 0,
      });

      const body = poll.authCalls[0].options.body as { record: Record<string, unknown> };
      expect(body.record.optionIndex).toBe(0);
    });
  });
});
