import { BlueskyApi } from './api';
import type { CreateLeafletDocumentInput, CreateLeafletPublicationInput } from './leaflet';
import type {
  BlueskyCreateDraftResponse,
  BlueskyDraft,
  BlueskyGetDraftsResponse,
  BlueskyUploadBlobResponse,
} from './types';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown> | FormData | Blob;
  params?: Record<string, string | string[]>;
  headers?: Record<string, string>;
};

type AuthCall = { endpoint: string; accessJwt: string; options: RequestOptions };
type RequestCall = { endpoint: string; options: RequestOptions };
type UploadBlobCall = { accessJwt: string; blob: Blob; mimeType: string };

/**
 * Same capturing harness as api.facade-part2.test.ts: the BlueskyApi facade
 * delegates to private sub-module instances (this.drafts, this.leaflet, ...),
 * so we replace each sub-module's protected request helpers with capturing
 * functions sharing a single response queue and call log.
 */
class TestApi extends BlueskyApi {
  public authCalls: AuthCall[] = [];
  public requestCalls: RequestCall[] = [];
  public uploadBlobCalls: UploadBlobCall[] = [];
  public responses: unknown[] = [];
  public uploadBlobResponses: BlueskyUploadBlobResponse[] = [];

  constructor() {
    super('https://pds.example');

    const submoduleNames = [
      'actors',
      'auth',
      'conversations',
      'drafts',
      'feeds',
      'graph',
      'grain',
      'flashes',
      'spark',
      'poll',
      'leaflet',
      'notifications',
      'search',
      'repos',
      'rpg',
      'sifa',
    ];

    const store = this as unknown as Record<string, Record<string, unknown>>;

    for (const name of submoduleNames) {
      const submodule = store[name];
      if (!submodule) continue;

      submodule.makeAuthenticatedRequest = async <T>(
        endpoint: string,
        accessJwt: string,
        options: RequestOptions = {},
      ): Promise<T> => {
        this.authCalls.push({ endpoint, accessJwt, options });
        return (this.responses.shift() as T) ?? (undefined as T);
      };

      submodule.makeRequest = async <T>(
        endpoint: string,
        options: RequestOptions = {},
      ): Promise<T> => {
        this.requestCalls.push({ endpoint, options });
        return (this.responses.shift() as T) ?? (undefined as T);
      };

      submodule.uploadBlob = async (
        accessJwt: string,
        blob: Blob,
        mimeType: string,
      ): Promise<BlueskyUploadBlobResponse> => {
        this.uploadBlobCalls.push({ accessJwt, blob, mimeType });
        const response = this.uploadBlobResponses.shift();
        if (!response) {
          throw new Error('No uploadBlob response configured');
        }
        return response;
      };
    }
  }
}

describe('BlueskyApi facade (part 3)', () => {
  describe('drafts', () => {
    it('getDrafts forwards limit and cursor', async () => {
      const api = new TestApi();
      const response = { drafts: [], cursor: 'next' } as unknown as BlueskyGetDraftsResponse;
      api.responses = [response];

      const result = await api.getDrafts('jwt', { limit: 10, cursor: 'cursor-1' });

      expect(result).toBe(response);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.draft.getDrafts',
        accessJwt: 'jwt',
        options: { params: { limit: '10', cursor: 'cursor-1' } },
      });
    });

    it('getDrafts sends empty params when no options are provided', async () => {
      const api = new TestApi();
      api.responses = [{ drafts: [] }];

      await api.getDrafts('jwt');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.draft.getDrafts',
        accessJwt: 'jwt',
        options: { params: {} },
      });
    });

    it('createDraft posts the draft wrapped in a draft field', async () => {
      const api = new TestApi();
      const response = { id: '3lab' } as unknown as BlueskyCreateDraftResponse;
      api.responses = [response];
      const draft = { text: 'hello' } as unknown as BlueskyDraft;

      const result = await api.createDraft('jwt', draft);

      expect(result).toBe(response);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.draft.createDraft',
        accessJwt: 'jwt',
        options: { method: 'POST', body: { draft } },
      });
    });

    it('updateDraft posts the nested {id, draft} payload', async () => {
      const api = new TestApi();
      api.responses = [undefined];
      const draft = { text: 'updated' } as unknown as BlueskyDraft;

      await api.updateDraft('jwt', '3lab', draft);

      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.draft.updateDraft',
        accessJwt: 'jwt',
        options: { method: 'POST', body: { draft: { id: '3lab', draft } } },
      });
    });

    it('deleteDraft posts only the id', async () => {
      const api = new TestApi();
      api.responses = [undefined];

      await api.deleteDraft('jwt', '3lab');

      expect(api.authCalls[0]).toEqual({
        endpoint: '/app.bsky.draft.deleteDraft',
        accessJwt: 'jwt',
        options: { method: 'POST', body: { id: '3lab' } },
      });
    });
  });

  describe('leaflet', () => {
    it('findOrCreateLeafletPublication returns the first existing publication', async () => {
      const api = new TestApi();
      api.responses = [
        {
          records: [
            { uri: 'at://did:example:me/pub.leaflet.publication/abc', cid: 'cid1', value: { name: 'Mine' } },
          ],
        },
      ];
      const defaults: CreateLeafletPublicationInput = { name: 'New pub' };

      const result = await api.findOrCreateLeafletPublication('jwt', 'did:example:me', defaults);

      expect(result).toEqual({
        uri: 'at://did:example:me/pub.leaflet.publication/abc',
        cid: 'cid1',
        rkey: 'abc',
      });
      // Only the listRecords lookup should have run; no createRecord.
      expect(api.authCalls).toHaveLength(1);
      expect(api.authCalls[0]).toEqual({
        endpoint: '/com.atproto.repo.listRecords',
        accessJwt: 'jwt',
        options: {
          params: { repo: 'did:example:me', collection: 'pub.leaflet.publication', limit: '10' },
        },
      });
    });

    it('findOrCreateLeafletPublication creates a publication when none exist', async () => {
      const api = new TestApi();
      api.responses = [
        { records: [] },
        { uri: 'at://did:example:me/pub.leaflet.publication/new', cid: 'cid2' },
      ];
      const defaults: CreateLeafletPublicationInput = { name: 'New pub', description: 'desc' };

      const result = await api.findOrCreateLeafletPublication('jwt', 'did:example:me', defaults);

      expect(result).toEqual({
        uri: 'at://did:example:me/pub.leaflet.publication/new',
        cid: 'cid2',
        rkey: 'new',
      });
      const createCall = api.authCalls[1];
      expect(createCall.endpoint).toBe('/com.atproto.repo.createRecord');
      expect(createCall.options.method).toBe('POST');
      const body = createCall.options.body as { repo: string; collection: string; record: Record<string, unknown> };
      expect(body.repo).toBe('did:example:me');
      expect(body.collection).toBe('pub.leaflet.publication');
      expect(body.record).toEqual({
        $type: 'pub.leaflet.publication',
        name: 'New pub',
        description: 'desc',
      });
    });

    it('createLeafletDocument builds a linearDocument with text and header blocks', async () => {
      const api = new TestApi();
      api.responses = [{ uri: 'at://did:example:me/pub.leaflet.document/doc1', cid: 'cid3' }];
      const input: CreateLeafletDocumentInput = {
        title: 'My doc',
        body: '# Heading\n\nFirst paragraph.\n\nSecond paragraph.',
        publicationUri: 'at://did:example:me/pub.leaflet.publication/abc',
        author: 'did:example:me',
      };

      const result = await api.createLeafletDocument('jwt', 'did:example:me', input);

      expect(result).toEqual({
        uri: 'at://did:example:me/pub.leaflet.document/doc1',
        cid: 'cid3',
        rkey: 'doc1',
      });
      const call = api.authCalls[0];
      expect(call.endpoint).toBe('/com.atproto.repo.createRecord');
      const body = call.options.body as { repo: string; collection: string; record: Record<string, unknown> };
      expect(body.repo).toBe('did:example:me');
      expect(body.collection).toBe('pub.leaflet.document');
      expect(body.record).toMatchObject({
        $type: 'pub.leaflet.document',
        title: 'My doc',
        author: 'did:example:me',
        publication: 'at://did:example:me/pub.leaflet.publication/abc',
      });
      expect(typeof body.record.publishedAt).toBe('string');
      const pages = body.record.pages as { $type: string; blocks: { block: Record<string, unknown> }[] }[];
      expect(pages[0].$type).toBe('pub.leaflet.pages.linearDocument');
      expect(pages[0].blocks).toEqual([
        { block: { $type: 'pub.leaflet.blocks.header', level: 1, plaintext: 'Heading' } },
        { block: { $type: 'pub.leaflet.blocks.text', plaintext: 'First paragraph.' } },
        { block: { $type: 'pub.leaflet.blocks.text', plaintext: 'Second paragraph.' } },
      ]);
    });
  });
});
