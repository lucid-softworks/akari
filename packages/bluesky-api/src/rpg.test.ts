import {
  BlueskyRpg,
  buildRpgItemBlobUrl,
  pickRpgItemImageCid,
  type RpgItemRecord,
  type RpgItemRecordsResponse,
} from './rpg';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown> | FormData | Blob;
  params?: Record<string, string | string[]>;
  headers?: Record<string, string>;
};

describe('BlueskyRpg', () => {
  class TestRpg extends BlueskyRpg {
    public authCalls: {
      endpoint: string;
      accessJwt: string;
      options: RequestOptions;
    }[] = [];

    public requestCalls: { endpoint: string; options: RequestOptions }[] = [];

    public responses: unknown[] = [];
    public shouldThrow = false;

    constructor() {
      super('https://pds.example');
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      accessJwt: string,
      options: RequestOptions = {},
    ): Promise<T> {
      this.authCalls.push({ endpoint, accessJwt, options });
      if (this.shouldThrow) {
        throw new Error('boom');
      }
      return this.responses.shift() as T;
    }

    protected async makeRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
      this.requestCalls.push({ endpoint, options });
      return this.responses.shift() as T;
    }
  }

  describe('getActorInventory', () => {
    it('lists records with default limit and no cursor', async () => {
      const rpg = new TestRpg();
      const response: RpgItemRecordsResponse = { records: [], cursor: undefined };
      rpg.responses = [response];

      const result = await rpg.getActorInventory('jwt', 'did:example:alice');

      expect(result).toBe(response);
      expect(rpg.authCalls).toHaveLength(1);
      expect(rpg.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.listRecords',
        accessJwt: 'jwt',
        options: {
          params: {
            repo: 'did:example:alice',
            collection: 'equipment.rpg.item',
            limit: '50',
          },
        },
      });
    });

    it('forwards a custom limit and cursor when provided', async () => {
      const rpg = new TestRpg();
      const response: RpgItemRecordsResponse = { records: [], cursor: 'next' };
      rpg.responses = [response];

      const result = await rpg.getActorInventory('jwt', 'did:example:bob', 25, 'cursor-123');

      expect(result).toBe(response);
      expect(rpg.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.listRecords',
        accessJwt: 'jwt',
        options: {
          params: {
            repo: 'did:example:bob',
            collection: 'equipment.rpg.item',
            limit: '25',
            cursor: 'cursor-123',
          },
        },
      });
    });

    it('returns an empty response when the request throws', async () => {
      const rpg = new TestRpg();
      rpg.shouldThrow = true;

      const result = await rpg.getActorInventory('jwt', 'did:example:carol');

      expect(result).toEqual({ records: [], cursor: undefined });
      expect(rpg.authCalls).toHaveLength(1);
    });
  });
});

describe('buildRpgItemBlobUrl', () => {
  it('builds a PDS-direct getBlob URL with encoded did and cid', () => {
    const url = buildRpgItemBlobUrl('https://pds.example', 'did:plc:abc', 'bafyCID');

    expect(url).toBe(
      'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aabc&cid=bafyCID',
    );
  });
});

describe('pickRpgItemImageCid', () => {
  const baseValue: RpgItemRecord['value'] = {
    $type: 'equipment.rpg.item',
    item: 'item-1',
    title: 'Hat',
    give: 'at://give/1',
    provider: 'did:plc:provider',
    acceptedAt: '2026-01-01T00:00:00.000Z',
  };

  it('prefers the icon cid when present', () => {
    const item: RpgItemRecord = {
      uri: 'at://item/1',
      cid: 'cid1',
      value: {
        ...baseValue,
        icon: { $type: 'blob', ref: { $link: 'icon-cid' }, mimeType: 'image/png', size: 1 },
        asset: { $type: 'blob', ref: { $link: 'asset-cid' }, mimeType: 'image/png', size: 2 },
      },
    };

    expect(pickRpgItemImageCid(item)).toBe('icon-cid');
  });

  it('falls back to the asset cid when no icon is present', () => {
    const item: RpgItemRecord = {
      uri: 'at://item/2',
      cid: 'cid2',
      value: {
        ...baseValue,
        asset: { $type: 'blob', ref: { $link: 'asset-cid' }, mimeType: 'image/png', size: 2 },
      },
    };

    expect(pickRpgItemImageCid(item)).toBe('asset-cid');
  });

  it('returns null when neither icon nor asset is present', () => {
    const item: RpgItemRecord = {
      uri: 'at://item/3',
      cid: 'cid3',
      value: { ...baseValue },
    };

    expect(pickRpgItemImageCid(item)).toBeNull();
  });
});
