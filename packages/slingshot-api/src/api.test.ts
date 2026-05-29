import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { SlingshotApi } from './api';
import { SlingshotApiClient, DEFAULT_SLINGSHOT_BASE_URL, createSlingshotApi } from './index';

const baseUrl = 'https://slingshot.test';
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('SlingshotApi', () => {
  const createApi = () => new SlingshotApi(baseUrl, { userAgent: 'akari-tests' });

  it('fetches a record with repo/collection/rkey query params', async () => {
    let requestedUrl: string | undefined;
    server.use(
      http.get(`${baseUrl}/xrpc/com.atproto.repo.getRecord`, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          uri: 'at://did:plc:abc/app.bsky.feed.post/123',
          cid: 'bafycid',
          value: { text: 'hello' },
        });
      }),
    );

    const result = await createApi().getRecord<{ text: string }>({
      repo: 'did:plc:abc',
      collection: 'app.bsky.feed.post',
      rkey: '123',
    });

    expect(result.value.text).toBe('hello');
    const url = new URL(requestedUrl ?? '');
    expect(url.searchParams.get('repo')).toBe('did:plc:abc');
    expect(url.searchParams.get('collection')).toBe('app.bsky.feed.post');
    expect(url.searchParams.get('rkey')).toBe('123');
  });

  it('resolves a handle to a DID', async () => {
    let requestedUrl: string | undefined;
    server.use(
      http.get(`${baseUrl}/xrpc/com.atproto.identity.resolveHandle`, ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({ did: 'did:plc:resolved' });
      }),
    );

    const result = await createApi().resolveHandle('alice.test');

    expect(result.did).toBe('did:plc:resolved');
    expect(new URL(requestedUrl ?? '').searchParams.get('handle')).toBe('alice.test');
  });

  it('sends the Accept header and a custom User-Agent', async () => {
    let accept: string | null = null;
    let userAgent: string | null = null;
    server.use(
      http.get(`${baseUrl}/xrpc/com.atproto.identity.resolveHandle`, ({ request }) => {
        accept = request.headers.get('accept');
        userAgent = request.headers.get('user-agent');
        return HttpResponse.json({ did: 'did:plc:x' });
      }),
    );

    await createApi().resolveHandle('a.test');

    expect(accept).toBe('application/json');
    expect(userAgent).toBe('akari-tests');
  });

  it('merges custom default headers from options', async () => {
    let custom: string | null = null;
    server.use(
      http.get(`${baseUrl}/xrpc/com.atproto.identity.resolveHandle`, ({ request }) => {
        custom = request.headers.get('x-custom');
        return HttpResponse.json({ did: 'did:plc:x' });
      }),
    );

    const api = new SlingshotApi(baseUrl, { headers: { 'x-custom': 'value' } });
    await api.resolveHandle('a.test');

    expect(custom).toBe('value');
  });

  it('throws a descriptive error on a non-ok response', async () => {
    server.use(
      http.get(`${baseUrl}/xrpc/com.atproto.identity.resolveHandle`, () =>
        HttpResponse.json({ error: 'NotFound' }, { status: 404, statusText: 'Not Found' }),
      ),
    );

    await expect(createApi().resolveHandle('ghost.test')).rejects.toThrow(
      /Slingshot request failed with status 404/,
    );
  });
});

describe('SlingshotApiClient base URL handling', () => {
  class TestClient extends SlingshotApiClient {
    fetchPath<T>(path: string, headers?: Record<string, string>) {
      return this.get<T>(path, undefined, headers);
    }
  }

  it('merges per-request headers over the defaults', async () => {
    let custom: string | null = null;
    server.use(
      http.get(`${baseUrl}/ping`, ({ request }) => {
        custom = request.headers.get('x-request');
        return HttpResponse.json({ ok: true });
      }),
    );
    const client = new TestClient(baseUrl);
    await client.fetchPath('/ping', { 'x-request': 'per-call' });
    expect(custom).toBe('per-call');
  });

  it('omits the status text suffix when it is empty', async () => {
    server.use(
      http.get(`${baseUrl}/ping`, () => new HttpResponse(null, { status: 500, statusText: '' })),
    );
    const client = new TestClient(baseUrl);
    await expect(client.fetchPath('/ping')).rejects.toThrow(
      'Slingshot request failed with status 500',
    );
  });

  it('falls back to the default base URL when given a blank string', async () => {
    server.use(
      http.get(`${DEFAULT_SLINGSHOT_BASE_URL}/ping`, () => HttpResponse.json({ ok: true })),
    );
    const client = new TestClient('   ');
    await expect(client.fetchPath('/ping')).resolves.toEqual({ ok: true });
  });

  it('strips trailing slashes from the base URL', async () => {
    server.use(http.get(`${baseUrl}/ping`, () => HttpResponse.json({ ok: true })));
    const client = new TestClient(`${baseUrl}///`);
    await expect(client.fetchPath('/ping')).resolves.toEqual({ ok: true });
  });

  it('normalizes a path without a leading slash', async () => {
    server.use(http.get(`${baseUrl}/ping`, () => HttpResponse.json({ ok: true })));
    const client = new TestClient(baseUrl);
    await expect(client.fetchPath('ping')).resolves.toEqual({ ok: true });
  });
});

describe('createSlingshotApi', () => {
  it('uses the default base URL when none is provided', async () => {
    server.use(
      http.get(`${DEFAULT_SLINGSHOT_BASE_URL}/xrpc/com.atproto.identity.resolveHandle`, () =>
        HttpResponse.json({ did: 'did:plc:default' }),
      ),
    );
    const api = createSlingshotApi();
    await expect(api.resolveHandle('a.test')).resolves.toEqual({ did: 'did:plc:default' });
  });

  it('honors a custom base URL', async () => {
    server.use(
      http.get(`${baseUrl}/xrpc/com.atproto.identity.resolveHandle`, () =>
        HttpResponse.json({ did: 'did:plc:custom' }),
      ),
    );
    const api = createSlingshotApi({ baseUrl });
    await expect(api.resolveHandle('a.test')).resolves.toEqual({ did: 'did:plc:custom' });
  });
});
