import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { BlueskyApiClient } from './client';

describe('BlueskyApiClient', () => {
  const server = setupServer();

  class TestClient extends BlueskyApiClient {
    constructor() {
      super('https://pds.example');
    }

    async callMakeRequest<T>(endpoint: string, options?: {
      method?: 'GET' | 'POST';
      headers?: Record<string, string>;
      body?: Record<string, unknown> | FormData | Blob;
      params?: Record<string, string>;
    }): Promise<T> {
      return this.makeRequest<T>(endpoint, options);
    }

    async callMakeAuthenticatedRequest<T>(
      endpoint: string,
      accessJwt: string,
      options?: {
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string>;
      },
    ): Promise<T> {
      return this.makeAuthenticatedRequest<T>(endpoint, accessJwt, options);
    }
  }

  class UploadClient extends BlueskyApiClient {
    public lastCall?: {
      endpoint: string;
      accessJwt: string;
      options: {
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        body?: Blob;
        params?: Record<string, string>;
      };
    };

    public response: unknown;

    constructor() {
      super('https://pds.example');
    }

    async callUploadBlob(accessJwt: string, blob: Blob, mimeType: string) {
      return this.uploadBlob(accessJwt, blob, mimeType);
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      accessJwt: string,
      options: {
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        body?: Blob;
        params?: Record<string, string>;
      } = {},
    ): Promise<T> {
      this.lastCall = { endpoint, accessJwt, options };
      return this.response as T;
    }
  }

  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
    jest.restoreAllMocks();
  });

  afterAll(() => server.close());

  it('makes requests with JSON payloads and query params', async () => {
    let capturedRequest: {
      url: string;
      method: string;
      headers: Record<string, string>;
      body: unknown;
    } | null = null;

    server.use(
      http.post('https://pds.example/xrpc/test.endpoint', async ({ request }) => {
        capturedRequest = {
          url: request.url,
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          body: await request.json(),
        };
        return HttpResponse.json({ success: true });
      }),
    );

    const client = new TestClient();
    const result = await client.callMakeRequest<{ success: boolean }>('/test.endpoint', {
      method: 'POST',
      headers: { 'X-Custom': 'value' },
      body: { hello: 'world' },
      params: { q: 'query' },
    });

    expect(result).toEqual({ success: true });
    expect(capturedRequest).not.toBeNull();
    const request = capturedRequest!;
    expect(request.url).toBe('https://pds.example/xrpc/test.endpoint?q=query');
    expect(request.method).toBe('POST');
    expect(request.headers['content-type']).toBe('application/json');
    expect(request.headers['x-custom']).toBe('value');
    expect(request.body).toEqual({ hello: 'world' });
  });

  it('omits content type header for FormData bodies', async () => {
    let capturedHeaders: Record<string, string> | null = null;
    let capturedFile: FormDataEntryValue | null = null;

    server.use(
      http.post('https://pds.example/xrpc/upload', async ({ request }) => {
        capturedHeaders = Object.fromEntries(request.headers.entries());
        const formData = await request.formData();
        capturedFile = formData.get('file');
        return HttpResponse.json({ done: true });
      }),
    );

    const formData = new FormData();
    formData.append('file', new Blob(['data'], { type: 'text/plain' }), 'file.txt');

    const client = new TestClient();
    await client.callMakeRequest('/upload', {
      method: 'POST',
      body: formData,
    });

    expect(capturedHeaders).not.toBeNull();
    const headers = capturedHeaders!;
    expect(headers['content-type']).toMatch(/^multipart\/form-data;/);
    expect(headers['content-type']).not.toBe('application/json');
    expect(capturedFile).toBeInstanceOf(Blob);
  });

  it('throws errors when response is not ok', async () => {
    server.use(
      http.get('https://pds.example/xrpc/fail', () =>
        HttpResponse.json({ message: 'Bad request' }, { status: 400 }),
      ),
    );

    const client = new TestClient();

    await expect(client.callMakeRequest('/fail')).rejects.toThrow('Bad request');
  });

  it('includes bearer token headers for authenticated requests', async () => {
    let capturedRequest: {
      url: string;
      headers: Record<string, string>;
      method: string;
    } | null = null;

    server.use(
      http.get('https://pds.example/xrpc/secure', async ({ request }) => {
        capturedRequest = {
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
          method: request.method,
        };
        return HttpResponse.json({});
      }),
    );

    const client = new TestClient();
    await client.callMakeAuthenticatedRequest('/secure', 'token-123', {
      params: { cursor: 'abc' },
    });

    expect(capturedRequest).not.toBeNull();
    const request = capturedRequest!;
    expect(request.url).toBe('https://pds.example/xrpc/secure?cursor=abc');
    expect(request.method).toBe('GET');
    expect(request.headers.authorization).toBe('Bearer token-123');
  });

  it('uploads blobs using the provided mime type', async () => {
    const client = new UploadClient();
    const response = {
      blob: {
        ref: { $link: 'blob-ref' },
        mimeType: 'image/png',
        size: 123,
      },
    };
    client.response = response;

    const blob = new Blob(['content'], { type: 'text/plain' });
    const result = await client.callUploadBlob('jwt-token', blob, 'image/png');

    expect(result).toEqual(response);
    expect(client.lastCall).toBeDefined();
    expect(client.lastCall?.endpoint).toBe('/com.atproto.repo.uploadBlob');
    expect(client.lastCall?.accessJwt).toBe('jwt-token');
    expect(client.lastCall?.options.headers).toEqual({ 'Content-Type': 'image/png' });
    expect(client.lastCall?.options.body).toBeInstanceOf(Blob);
    expect(client.lastCall?.options.body?.type).toBe('image/png');
  });
});
