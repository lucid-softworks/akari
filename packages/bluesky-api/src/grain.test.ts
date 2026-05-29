import {
  BlueskyGrain,
  buildGrainPhotoBlobUrl,
  type GrainGalleryItemRecordsResponse,
  type GrainGalleryRecordsResponse,
  type GrainPhotoExifRecordsResponse,
  type GrainPhotoRecordsResponse,
} from './grain';

describe('BlueskyGrain', () => {
  class TestGrain extends BlueskyGrain {
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

    public responses: unknown[] = [];
    public throwOnNext = false;

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
      if (this.throwOnNext) {
        throw new Error('request failed');
      }
      return (this.responses.shift() as T) ?? (undefined as T);
    }
  }

  describe('getActorGalleries', () => {
    it('lists gallery records with the default limit and no cursor', async () => {
      const grain = new TestGrain();
      const response = { records: [], cursor: undefined } as GrainGalleryRecordsResponse;
      grain.responses = [response];

      const result = await grain.getActorGalleries('jwt', 'did:example:alice');

      expect(result).toBe(response);
      expect(grain.authCalls).toEqual([
        {
          endpoint: '/com.atproto.repo.listRecords',
          accessJwt: 'jwt',
          options: {
            params: {
              repo: 'did:example:alice',
              collection: 'social.grain.gallery',
              limit: '50',
            },
          },
        },
      ]);
    });

    it('forwards a custom limit and cursor', async () => {
      const grain = new TestGrain();
      const response = { records: [], cursor: 'next' } as GrainGalleryRecordsResponse;
      grain.responses = [response];

      const result = await grain.getActorGalleries('jwt', 'did:example:alice', 10, 'cursor-1');

      expect(result).toBe(response);
      expect(grain.authCalls[0].options.params).toEqual({
        repo: 'did:example:alice',
        collection: 'social.grain.gallery',
        limit: '10',
        cursor: 'cursor-1',
      });
    });

    it('returns an empty result when the request throws', async () => {
      const grain = new TestGrain();
      grain.throwOnNext = true;

      const result = await grain.getActorGalleries('jwt', 'did:example:alice');

      expect(result).toEqual({ records: [], cursor: undefined });
    });
  });

  describe('getActorPhotos', () => {
    it('lists photo records with the default limit and no cursor', async () => {
      const grain = new TestGrain();
      const response = { records: [], cursor: undefined } as GrainPhotoRecordsResponse;
      grain.responses = [response];

      const result = await grain.getActorPhotos('jwt', 'did:example:bob');

      expect(result).toBe(response);
      expect(grain.authCalls).toEqual([
        {
          endpoint: '/com.atproto.repo.listRecords',
          accessJwt: 'jwt',
          options: {
            params: {
              repo: 'did:example:bob',
              collection: 'social.grain.photo',
              limit: '50',
            },
          },
        },
      ]);
    });

    it('forwards a custom limit and cursor', async () => {
      const grain = new TestGrain();
      const response = { records: [], cursor: 'next' } as GrainPhotoRecordsResponse;
      grain.responses = [response];

      const result = await grain.getActorPhotos('jwt', 'did:example:bob', 25, 'cursor-2');

      expect(result).toBe(response);
      expect(grain.authCalls[0].options.params).toEqual({
        repo: 'did:example:bob',
        collection: 'social.grain.photo',
        limit: '25',
        cursor: 'cursor-2',
      });
    });

    it('returns an empty result when the request throws', async () => {
      const grain = new TestGrain();
      grain.throwOnNext = true;

      const result = await grain.getActorPhotos('jwt', 'did:example:bob');

      expect(result).toEqual({ records: [], cursor: undefined });
    });
  });

  describe('getActorGalleryItems', () => {
    it('lists gallery item records with the default limit and no cursor', async () => {
      const grain = new TestGrain();
      const response = { records: [], cursor: undefined } as GrainGalleryItemRecordsResponse;
      grain.responses = [response];

      const result = await grain.getActorGalleryItems('jwt', 'did:example:carol');

      expect(result).toBe(response);
      expect(grain.authCalls).toEqual([
        {
          endpoint: '/com.atproto.repo.listRecords',
          accessJwt: 'jwt',
          options: {
            params: {
              repo: 'did:example:carol',
              collection: 'social.grain.gallery.item',
              limit: '100',
            },
          },
        },
      ]);
    });

    it('forwards a custom limit and cursor', async () => {
      const grain = new TestGrain();
      const response = { records: [], cursor: 'next' } as GrainGalleryItemRecordsResponse;
      grain.responses = [response];

      const result = await grain.getActorGalleryItems('jwt', 'did:example:carol', 5, 'cursor-3');

      expect(result).toBe(response);
      expect(grain.authCalls[0].options.params).toEqual({
        repo: 'did:example:carol',
        collection: 'social.grain.gallery.item',
        limit: '5',
        cursor: 'cursor-3',
      });
    });

    it('returns an empty result when the request throws', async () => {
      const grain = new TestGrain();
      grain.throwOnNext = true;

      const result = await grain.getActorGalleryItems('jwt', 'did:example:carol');

      expect(result).toEqual({ records: [], cursor: undefined });
    });
  });

  describe('getActorPhotoExif', () => {
    it('lists exif records with the default limit and no cursor', async () => {
      const grain = new TestGrain();
      const response = { records: [], cursor: undefined } as GrainPhotoExifRecordsResponse;
      grain.responses = [response];

      const result = await grain.getActorPhotoExif('jwt', 'did:example:dave');

      expect(result).toBe(response);
      expect(grain.authCalls).toEqual([
        {
          endpoint: '/com.atproto.repo.listRecords',
          accessJwt: 'jwt',
          options: {
            params: {
              repo: 'did:example:dave',
              collection: 'social.grain.photo.exif',
              limit: '100',
            },
          },
        },
      ]);
    });

    it('forwards a custom limit and cursor', async () => {
      const grain = new TestGrain();
      const response = { records: [], cursor: 'next' } as GrainPhotoExifRecordsResponse;
      grain.responses = [response];

      const result = await grain.getActorPhotoExif('jwt', 'did:example:dave', 7, 'cursor-4');

      expect(result).toBe(response);
      expect(grain.authCalls[0].options.params).toEqual({
        repo: 'did:example:dave',
        collection: 'social.grain.photo.exif',
        limit: '7',
        cursor: 'cursor-4',
      });
    });

    it('returns an empty result when the request throws', async () => {
      const grain = new TestGrain();
      grain.throwOnNext = true;

      const result = await grain.getActorPhotoExif('jwt', 'did:example:dave');

      expect(result).toEqual({ records: [], cursor: undefined });
    });
  });
});

describe('buildGrainPhotoBlobUrl', () => {
  it('builds a PDS-direct getBlob URL with did and cid query params', () => {
    const url = buildGrainPhotoBlobUrl('https://pds.example', 'did:plc:abc', 'bafycid');

    expect(url).toBe(
      'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aabc&cid=bafycid',
    );
  });

  it('url-encodes did and cid values that contain reserved characters', () => {
    const url = buildGrainPhotoBlobUrl('https://pds.example', 'did:web:example.com#key', 'a+b/c=d');

    expect(url).toBe(
      'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aweb%3Aexample.com%23key&cid=a%2Bb%2Fc%3Dd',
    );
  });
});
