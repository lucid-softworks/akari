import { BlueskyRepo } from './repo';
import type { BlueskyRepoListRecordsResponse } from './types';

describe('BlueskyRepo', () => {
  class TestRepo extends BlueskyRepo {
    public calls: {
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

    protected async makeRequest<T>(
      endpoint: string,
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      } = {},
    ): Promise<T> {
      this.calls.push({ endpoint, options });
      return (this.responses.shift() as T) ?? (undefined as T);
    }
  }

  it('serialises query parameters when listing records', async () => {
    const repo = new TestRepo();
    const response = {
      records: [],
      cursor: 'cursor',
    } as BlueskyRepoListRecordsResponse;

    repo.responses = [response];

    await expect(
      repo.listRecords({
        collection: 'pub.leaflet.document',
        repo: 'did:example:alice',
        limit: 5,
        cursor: 'prev',
        rkeyStart: 'a',
        rkeyEnd: 'b',
        reverse: true,
      }),
    ).resolves.toBe(response);

    expect(repo.calls).toEqual([
      {
        endpoint: '/com.atproto.repo.listRecords',
        options: {
          params: {
            collection: 'pub.leaflet.document',
            repo: 'did:example:alice',
            limit: '5',
            cursor: 'prev',
            rkeyStart: 'a',
            rkeyEnd: 'b',
            reverse: 'true',
          },
        },
      },
    ]);
  });
});
