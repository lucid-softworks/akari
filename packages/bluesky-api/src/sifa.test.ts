import {
  BlueskySifa,
  buildSifaAvatarUrl,
  humanizeSifaToken,
} from './sifa';
import type {
  SifaEducationRecordsResponse,
  SifaPositionRecordsResponse,
  SifaSelfRecord,
} from './sifa';

describe('BlueskySifa', () => {
  class TestSifa extends BlueskySifa {
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
    public errors: unknown[] = [];

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
      if (this.errors.length > 0) {
        throw this.errors.shift();
      }
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

  describe('getProfileSelf', () => {
    it('reads the self record via getRecord', async () => {
      const sifa = new TestSifa();
      const record = {
        uri: 'at://did:example:me/id.sifa.profile.self/self',
        cid: 'cid1',
        value: { $type: 'id.sifa.profile.self', createdAt: '2024-01-01' },
      } as SifaSelfRecord;
      sifa.responses = [record];

      const result = await sifa.getProfileSelf('jwt', 'did:example:me');

      expect(result).toBe(record);
      expect(sifa.authCalls).toEqual([
        {
          endpoint: '/com.atproto.repo.getRecord',
          accessJwt: 'jwt',
          options: {
            params: {
              repo: 'did:example:me',
              collection: 'id.sifa.profile.self',
              rkey: 'self',
            },
          },
        },
      ]);
    });

    it('returns null when the record is not found (errorCode)', async () => {
      const sifa = new TestSifa();
      sifa.errors = [{ errorCode: 'RecordNotFound' }];

      const result = await sifa.getProfileSelf('jwt', 'did:example:me');

      expect(result).toBeNull();
    });

    it('returns null when the request 404s (status)', async () => {
      const sifa = new TestSifa();
      sifa.errors = [{ status: 404 }];

      const result = await sifa.getProfileSelf('jwt', 'did:example:me');

      expect(result).toBeNull();
    });

    it('returns null for any other failure (e.g. 401)', async () => {
      const sifa = new TestSifa();
      sifa.errors = [{ status: 401 }];

      const result = await sifa.getProfileSelf('jwt', 'did:example:me');

      expect(result).toBeNull();
    });
  });

  describe('getActorPositions', () => {
    it('lists positions with the default limit and no cursor', async () => {
      const sifa = new TestSifa();
      const response = { records: [] } as SifaPositionRecordsResponse;
      sifa.responses = [response];

      const result = await sifa.getActorPositions('jwt', 'did:example:me');

      expect(result).toBe(response);
      expect(sifa.authCalls).toEqual([
        {
          endpoint: '/com.atproto.repo.listRecords',
          accessJwt: 'jwt',
          options: {
            params: {
              repo: 'did:example:me',
              collection: 'id.sifa.profile.position',
              limit: '50',
            },
          },
        },
      ]);
    });

    it('forwards a custom limit and cursor', async () => {
      const sifa = new TestSifa();
      const response = { records: [], cursor: 'next' } as SifaPositionRecordsResponse;
      sifa.responses = [response];

      const result = await sifa.getActorPositions('jwt', 'did:example:me', 10, 'cursor-1');

      expect(result).toBe(response);
      expect(sifa.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.listRecords',
        accessJwt: 'jwt',
        options: {
          params: {
            repo: 'did:example:me',
            collection: 'id.sifa.profile.position',
            limit: '10',
            cursor: 'cursor-1',
          },
        },
      });
    });

    it('returns an empty result set when the request fails', async () => {
      const sifa = new TestSifa();
      sifa.errors = [new Error('boom')];

      const result = await sifa.getActorPositions('jwt', 'did:example:me');

      expect(result).toEqual({ records: [], cursor: undefined });
    });
  });

  describe('getActorEducation', () => {
    it('lists education with the default limit and no cursor', async () => {
      const sifa = new TestSifa();
      const response = { records: [] } as SifaEducationRecordsResponse;
      sifa.responses = [response];

      const result = await sifa.getActorEducation('jwt', 'did:example:me');

      expect(result).toBe(response);
      expect(sifa.authCalls).toEqual([
        {
          endpoint: '/com.atproto.repo.listRecords',
          accessJwt: 'jwt',
          options: {
            params: {
              repo: 'did:example:me',
              collection: 'id.sifa.profile.education',
              limit: '50',
            },
          },
        },
      ]);
    });

    it('forwards a custom limit and cursor', async () => {
      const sifa = new TestSifa();
      const response = { records: [], cursor: 'next' } as SifaEducationRecordsResponse;
      sifa.responses = [response];

      const result = await sifa.getActorEducation('jwt', 'did:example:me', 5, 'cursor-2');

      expect(result).toBe(response);
      expect(sifa.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.listRecords',
        accessJwt: 'jwt',
        options: {
          params: {
            repo: 'did:example:me',
            collection: 'id.sifa.profile.education',
            limit: '5',
            cursor: 'cursor-2',
          },
        },
      });
    });

    it('returns an empty result set when the request fails', async () => {
      const sifa = new TestSifa();
      sifa.errors = [new Error('boom')];

      const result = await sifa.getActorEducation('jwt', 'did:example:me');

      expect(result).toEqual({ records: [], cursor: undefined });
    });
  });
});

describe('buildSifaAvatarUrl', () => {
  it('builds a PDS-direct getBlob URL with encoded did and cid', () => {
    const url = buildSifaAvatarUrl(
      'https://pds.example',
      'did:plc:abc',
      'bafycid',
    );

    expect(url).toBe(
      'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aabc&cid=bafycid',
    );
  });

  it('encodes characters that require escaping', () => {
    const url = buildSifaAvatarUrl(
      'https://pds.example',
      'did:web:example.com/path',
      'cid+with/special',
    );

    expect(url).toBe(
      'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aweb%3Aexample.com%2Fpath&cid=cid%2Bwith%2Fspecial',
    );
  });
});

describe('humanizeSifaToken', () => {
  it('returns an empty string for undefined', () => {
    expect(humanizeSifaToken(undefined)).toBe('');
  });

  it('returns an empty string for an empty string', () => {
    expect(humanizeSifaToken('')).toBe('');
  });

  it('returns an empty string when only a fragment prefix is present', () => {
    expect(humanizeSifaToken('id.sifa.defs#')).toBe('');
  });

  it('strips the NSID fragment prefix and splits camelCase', () => {
    expect(humanizeSifaToken('id.sifa.defs#fullTime')).toBe('Full Time');
  });

  it('capitalises a bare single word with no fragment', () => {
    expect(humanizeSifaToken('remote')).toBe('Remote');
  });

  it('handles multiple camelCase boundaries', () => {
    expect(humanizeSifaToken('id.sifa.defs#openToContractWork')).toBe(
      'Open To Contract Work',
    );
  });

  it('leaves an already-capitalised single word unchanged in shape', () => {
    expect(humanizeSifaToken('Hybrid')).toBe('Hybrid');
  });
});
