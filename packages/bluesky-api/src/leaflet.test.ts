import { BlueskyLeaflet } from './leaflet';
import type { LeafletPublicationRecord } from './leaflet';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown> | FormData | Blob;
  params?: Record<string, string | string[]>;
  headers?: Record<string, string>;
};

describe('BlueskyLeaflet', () => {
  class TestLeaflet extends BlueskyLeaflet {
    public authCalls: {
      endpoint: string;
      accessJwt: string;
      options: RequestOptions;
    }[] = [];

    public requestCalls: {
      endpoint: string;
      options: RequestOptions;
    }[] = [];

    public responses: unknown[] = [];

    /** When set, makeAuthenticatedRequest throws on the matching call index. */
    public throwOnAuthCall: number | null = null;

    constructor() {
      super('https://pds.example');
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      accessJwt: string,
      options: RequestOptions = {},
    ): Promise<T> {
      const index = this.authCalls.length;
      this.authCalls.push({ endpoint, accessJwt, options });
      if (this.throwOnAuthCall === index) {
        throw new Error('simulated failure');
      }
      return (this.responses.shift() as T) ?? (undefined as T);
    }

    protected async makeRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
      this.requestCalls.push({ endpoint, options });
      return (this.responses.shift() as T) ?? (undefined as T);
    }
  }

  describe('listPublications', () => {
    it('returns the listRecords response with default limit', async () => {
      const leaflet = new TestLeaflet();
      const response = {
        records: [{ uri: 'at://did/pub.leaflet.publication/abc', cid: 'cid1', value: {} }],
        cursor: 'next',
      };
      leaflet.responses = [response];

      const result = await leaflet.listPublications('jwt', 'did:example:me');

      expect(result).toBe(response);
      expect(leaflet.authCalls).toEqual([
        {
          endpoint: '/com.atproto.repo.listRecords',
          accessJwt: 'jwt',
          options: {
            params: {
              repo: 'did:example:me',
              collection: 'pub.leaflet.publication',
              limit: '10',
            },
          },
        },
      ]);
    });

    it('treats request failures as an empty record set', async () => {
      const leaflet = new TestLeaflet();
      leaflet.throwOnAuthCall = 0;

      const result = await leaflet.listPublications('jwt', 'did:example:me');

      expect(result).toEqual({ records: [] });
      expect(leaflet.authCalls).toHaveLength(1);
    });
  });

  describe('findOrCreatePublication', () => {
    it('returns the first existing publication and derives the rkey from its uri', async () => {
      const leaflet = new TestLeaflet();
      const existing: { records: LeafletPublicationRecord[] } = {
        records: [
          { uri: 'at://did:example:me/pub.leaflet.publication/rkey-1', cid: 'cid-existing', value: { name: 'Mine' } },
          { uri: 'at://did:example:me/pub.leaflet.publication/rkey-2', cid: 'cid-other', value: {} },
        ],
      };
      leaflet.responses = [existing];

      const result = await leaflet.findOrCreatePublication('jwt', 'did:example:me', { name: 'Default' });

      expect(result).toEqual({
        uri: 'at://did:example:me/pub.leaflet.publication/rkey-1',
        cid: 'cid-existing',
        rkey: 'rkey-1',
      });
      // Only listPublications should have been called; no createRecord.
      expect(leaflet.authCalls).toHaveLength(1);
      expect(leaflet.authCalls[0].endpoint).toBe('/com.atproto.repo.listRecords');
    });

    it('falls back to an empty rkey when the existing uri has no trailing segment', async () => {
      const leaflet = new TestLeaflet();
      const existing: { records: LeafletPublicationRecord[] } = {
        records: [{ uri: '', cid: 'cid-existing', value: {} }],
      };
      leaflet.responses = [existing];

      const result = await leaflet.findOrCreatePublication('jwt', 'did:example:me', { name: 'Default' });

      expect(result).toEqual({ uri: '', cid: 'cid-existing', rkey: '' });
    });

    it('creates a new publication with description when none exists', async () => {
      const leaflet = new TestLeaflet();
      const listResponse = { records: [] };
      const createResponse = { uri: 'at://did:example:me/pub.leaflet.publication/new-rkey', cid: 'cid-new' };
      leaflet.responses = [listResponse, createResponse];

      const result = await leaflet.findOrCreatePublication('jwt', 'did:example:me', {
        name: 'My Pub',
        description: 'A description',
      });

      expect(result).toEqual({
        uri: 'at://did:example:me/pub.leaflet.publication/new-rkey',
        cid: 'cid-new',
        rkey: 'new-rkey',
      });
      expect(leaflet.authCalls).toHaveLength(2);
      expect(leaflet.authCalls[1]).toEqual({
        endpoint: '/com.atproto.repo.createRecord',
        accessJwt: 'jwt',
        options: {
          method: 'POST',
          body: {
            repo: 'did:example:me',
            collection: 'pub.leaflet.publication',
            record: {
              $type: 'pub.leaflet.publication',
              name: 'My Pub',
              description: 'A description',
            },
          },
        },
      });
    });

    it('omits the description field when no description is supplied', async () => {
      const leaflet = new TestLeaflet();
      const listResponse = { records: [] };
      const createResponse = { uri: 'at://did:example:me/pub.leaflet.publication/r', cid: 'cid-new' };
      leaflet.responses = [listResponse, createResponse];

      await leaflet.findOrCreatePublication('jwt', 'did:example:me', { name: 'No Desc' });

      const createBody = leaflet.authCalls[1].options.body as { record: Record<string, unknown> };
      expect(createBody.record).toEqual({
        $type: 'pub.leaflet.publication',
        name: 'No Desc',
      });
      expect(createBody.record).not.toHaveProperty('description');
    });

    it('falls back to an empty rkey when the created uri has no trailing segment', async () => {
      const leaflet = new TestLeaflet();
      const listResponse = { records: [] };
      const createResponse = { uri: '', cid: 'cid-new' };
      leaflet.responses = [listResponse, createResponse];

      const result = await leaflet.findOrCreatePublication('jwt', 'did:example:me', { name: 'X' });

      expect(result).toEqual({ uri: '', cid: 'cid-new', rkey: '' });
    });
  });

  describe('createDocument', () => {
    it('ships paragraphs as text and header blocks and derives the rkey', async () => {
      const leaflet = new TestLeaflet();
      const createResponse = { uri: 'at://did:example:me/pub.leaflet.document/doc-rkey', cid: 'cid-doc' };
      leaflet.responses = [createResponse];

      const result = await leaflet.createDocument('jwt', 'did:example:me', {
        title: 'My Title',
        body: '# Heading One\n\nFirst paragraph.\n\n### Smaller heading\n\nSecond paragraph.',
        publicationUri: 'at://did:example:me/pub.leaflet.publication/pub-rkey',
        author: 'did:example:me',
      });

      expect(result).toEqual({
        uri: 'at://did:example:me/pub.leaflet.document/doc-rkey',
        cid: 'cid-doc',
        rkey: 'doc-rkey',
      });

      expect(leaflet.authCalls).toHaveLength(1);
      const call = leaflet.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(call.accessJwt).toBe('jwt');
      expect(call.options.method).toBe('POST');

      const body = call.options.body as { repo: string; collection: string; record: Record<string, unknown> };
      expect(body.repo).toBe('did:example:me');
      expect(body.collection).toBe('pub.leaflet.document');
      expect(body.record).toMatchObject({
        $type: 'pub.leaflet.document',
        title: 'My Title',
        author: 'did:example:me',
        publication: 'at://did:example:me/pub.leaflet.publication/pub-rkey',
      });
      expect(typeof body.record.publishedAt).toBe('string');

      const pages = body.record.pages as { $type: string; blocks: { block: Record<string, unknown> }[] }[];
      expect(pages).toHaveLength(1);
      expect(pages[0].$type).toBe('pub.leaflet.pages.linearDocument');
      expect(pages[0].blocks).toEqual([
        { block: { $type: 'pub.leaflet.blocks.header', level: 1, plaintext: 'Heading One' } },
        { block: { $type: 'pub.leaflet.blocks.text', plaintext: 'First paragraph.' } },
        { block: { $type: 'pub.leaflet.blocks.header', level: 3, plaintext: 'Smaller heading' } },
        { block: { $type: 'pub.leaflet.blocks.text', plaintext: 'Second paragraph.' } },
      ]);
    });

    it('produces an empty block list for whitespace-only bodies', async () => {
      const leaflet = new TestLeaflet();
      const createResponse = { uri: 'at://did/pub.leaflet.document/d', cid: 'cid-doc' };
      leaflet.responses = [createResponse];

      await leaflet.createDocument('jwt', 'did:example:me', {
        title: 'Empty',
        body: '   \n\n   \n\n  ',
        publicationUri: 'at://pub',
        author: 'did:example:me',
      });

      const body = leaflet.authCalls[0].options.body as { record: Record<string, unknown> };
      const pages = body.record.pages as { blocks: unknown[] }[];
      expect(pages[0].blocks).toEqual([]);
    });

    it('falls back to an empty rkey when the created uri has no trailing segment', async () => {
      const leaflet = new TestLeaflet();
      leaflet.responses = [{ uri: '', cid: 'cid-doc' }];

      const result = await leaflet.createDocument('jwt', 'did:example:me', {
        title: 'T',
        body: 'plain text body',
        publicationUri: 'at://pub',
        author: 'did:example:me',
      });

      expect(result).toEqual({ uri: '', cid: 'cid-doc', rkey: '' });
    });
  });
});
