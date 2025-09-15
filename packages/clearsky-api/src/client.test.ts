import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ClearSkyApi } from './api';
import { ClearSkyApiClient } from './client';

class TestClient extends ClearSkyApiClient {
  public getPublic<T>(endpoint: string, params?: Record<string, string>) {
    return this.get<T>(endpoint, params);
  }

  public postPublic<T>(
    endpoint: string,
    body?: Record<string, unknown> | FormData,
    params?: Record<string, string>,
  ) {
    return this.post<T>(endpoint, body as Record<string, unknown>, params);
  }
}

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

describe('ClearSkyApiClient', () => {
  it('makes GET requests with query parameters', async () => {
    let capturedUrl: URL | undefined;
    let capturedMethod: string | undefined;
    let capturedContentType: string | null = null;

    server.use(
      http.get('https://example.com/test', ({ request }) => {
        capturedUrl = new URL(request.url);
        capturedMethod = request.method;
        capturedContentType = request.headers.get('Content-Type');
        return HttpResponse.json({ result: 'ok' });
      }),
    );

    const client = new TestClient('https://example.com');
    const data = await client.getPublic('/test', { q: 'search', page: '2' });

    expect(capturedUrl?.toString()).toBe('https://example.com/test?q=search&page=2');
    expect(capturedMethod).toBe('GET');
    expect(capturedContentType).toBe('application/json');
    expect(data).toEqual({ result: 'ok' });
  });

  it('makes POST requests with JSON body', async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    let capturedContentType: string | null = null;
    let capturedBody: unknown;

    server.use(
      http.post('https://example.com/create', async ({ request }) => {
        capturedUrl = request.url;
        capturedMethod = request.method;
        capturedContentType = request.headers.get('Content-Type');
        capturedBody = await request.json();
        return HttpResponse.json({ success: true });
      }),
    );

    const client = new TestClient('https://example.com');
    const body = { foo: 'bar' };
    const data = await client.postPublic('/create', body);

    expect(capturedUrl).toBe('https://example.com/create');
    expect(capturedMethod).toBe('POST');
    expect(capturedContentType).toBe('application/json');
    expect(capturedBody).toEqual(body);
    expect(data).toEqual({ success: true });
  });

  it('throws error with message from response when request fails', async () => {
    const errorResponse = { message: 'not found' };

    server.use(
      http.get('https://example.com/missing', () =>
        HttpResponse.json(errorResponse, { status: 404, statusText: 'Not Found' }),
      ),
    );

    const client = new TestClient('https://example.com');

    await expect(client.getPublic('/missing')).rejects.toThrow('not found');
  });
});

describe('ClearSkyApi', () => {
  it('fetches DID for a handle', async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    let capturedContentType: string | null = null;

    server.use(
      http.get('https://example.com/api/v1/anon/get-did/alice', ({ request }) => {
        capturedUrl = request.url;
        capturedMethod = request.method;
        capturedContentType = request.headers.get('Content-Type');
        return HttpResponse.json({ did: 'did:example:123' });
      }),
    );

    const api = new ClearSkyApi('https://example.com');
    const data = await api.getDid('alice');

    expect(capturedUrl).toBe('https://example.com/api/v1/anon/get-did/alice');
    expect(capturedMethod).toBe('GET');
    expect(capturedContentType).toBe('application/json');
    expect(data).toEqual({ did: 'did:example:123' });
  });
});
