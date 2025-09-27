import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ClearSkyApiClient } from './client';
import type { ClearSkyRequestOptions } from './types';

class TestClient extends ClearSkyApiClient {
  public getPublic<T>(endpoint: string, queryParameters?: Record<string, string | null>) {
    return this.get<T>(endpoint, queryParameters);
  }

  public postPublic<T>(
    endpoint: string,
    body?: Record<string, unknown> | FormData,
    queryParameters?: Record<string, string | null>,
  ) {
    return this.post<T>(endpoint, body as Record<string, unknown>, queryParameters);
  }

  public makeRequestPublic<T>(endpoint: string, options: ClearSkyRequestOptions = {}) {
    return this.makeRequest<T>(endpoint, options);
  }

  public makeRequestWithoutOptions<T>(endpoint: string) {
    return this.makeRequest<T>(endpoint);
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

  it('uses the default base URL when none is provided', async () => {
    let capturedUrl: string | undefined;

    server.use(
      http.get('https://api.clearsky.services/test-default', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ result: 'default' });
      }),
    );

    const client = new TestClient();
    const data = await client.getPublic('/test-default');

    expect(capturedUrl).toBe('https://api.clearsky.services/test-default');
    expect(data).toEqual({ result: 'default' });
  });

  it('makes GET requests without query parameters', async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;

    server.use(
      http.get('https://example.com/simple', ({ request }) => {
        capturedUrl = request.url;
        capturedMethod = request.method;
        return HttpResponse.json({ result: 'simple' });
      }),
    );

    const client = new TestClient('https://example.com');
    const data = await client.getPublic('/simple');

    expect(capturedUrl).toBe('https://example.com/simple');
    expect(capturedMethod).toBe('GET');
    expect(data).toEqual({ result: 'simple' });
  });

  it('merges custom headers and query parameters when making requests', async () => {
    let capturedUrl: string | undefined;
    let capturedAuthorization: string | null = null;

    server.use(
      http.get('https://example.com/custom', ({ request }) => {
        capturedUrl = request.url;
        capturedAuthorization = request.headers.get('Authorization');
        return HttpResponse.json({ custom: true });
      }),
    );

    const client = new TestClient('https://example.com');
    const data = await client.makeRequestPublic('/custom', {
      queryParameters: { mode: 'full' },
      headers: { Authorization: 'Bearer token-123' },
    });

    expect(capturedUrl).toBe('https://example.com/custom?mode=full');
    expect(capturedAuthorization).toBe('Bearer token-123');
    expect(data).toEqual({ custom: true });
  });

  it('uses default request options when none are provided', async () => {
    let capturedMethod: string | undefined;
    let capturedContentType: string | null = null;

    server.use(
      http.get('https://example.com/default-options', ({ request }) => {
        capturedMethod = request.method;
        capturedContentType = request.headers.get('Content-Type');
        return HttpResponse.json({ ok: true });
      }),
    );

    const client = new TestClient('https://example.com');
    const data = await client.makeRequestWithoutOptions('/default-options');

    expect(capturedMethod).toBe('GET');
    expect(capturedContentType).toBe('application/json');
    expect(data).toEqual({ ok: true });
  });

  it('makes POST requests with JSON body and query parameters', async () => {
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
    const data = await client.postPublic('/create', body, { kind: 'new' });

    expect(capturedUrl).toBe('https://example.com/create?kind=new');
    expect(capturedMethod).toBe('POST');
    expect(capturedContentType).toBe('application/json');
    expect(capturedBody).toEqual(body);
    expect(data).toEqual({ success: true });
  });

  it('serializes FormData bodies without converting to JSON', () => {
    const client = new TestClient('https://example.com');
    const serializer = client as unknown as {
      serializeBody: (body: Record<string, unknown> | FormData | Blob) => BodyInit;
    };
    const formData = new FormData();
    formData.append('field', 'value');

    const serialized = serializer.serializeBody(formData);

    expect(serialized).toBe(formData);
  });

  it('serializes Blob bodies without converting to JSON', () => {
    const client = new TestClient('https://example.com');
    const serializer = client as unknown as {
      serializeBody: (body: Record<string, unknown> | FormData | Blob) => BodyInit;
    };
    const blob = new Blob(['payload'], { type: 'text/plain' });

    const serialized = serializer.serializeBody(blob);

    expect(serialized).toBe(blob);
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

  it('throws generic error when non-JSON response is returned', async () => {
    server.use(
      http.get('https://example.com/text-error', () =>
        HttpResponse.text('Service unavailable', { status: 503, statusText: 'Service Unavailable' }),
      ),
    );

    const client = new TestClient('https://example.com');

    await expect(client.getPublic('/text-error')).rejects.toThrow('Request failed with status 503');
  });

  it('falls back to status message when JSON error lacks message', async () => {
    server.use(
      http.get('https://example.com/empty-error', () =>
        HttpResponse.json({}, { status: 500, statusText: 'Internal Server Error' }),
      ),
    );

    const client = new TestClient('https://example.com');

    await expect(client.getPublic('/empty-error')).rejects.toThrow('Request failed with status 500');
  });
});
