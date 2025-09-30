import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { BlueskyApiClient } from './client';
import type { BlueskyApiClientOptions } from './client';
import type { BlueskySession } from './types';

describe('BlueskyApiClient', () => {
  const server = setupServer();

  const createSession = (overrides: Partial<BlueskySession> = {}): BlueskySession =>
    ({
      handle: 'user.test',
      did: 'did:plc:123',
      active: true,
      accessJwt: 'access-token',
      refreshJwt: 'refresh-token',
      ...overrides,
    } as BlueskySession);

  class TestClient extends BlueskyApiClient {
    constructor(options?: BlueskyApiClientOptions) {
      super('https://pds.example', options);
    }

    async callMakeRequest<T>(endpoint: string, options?: {
      method?: 'GET' | 'POST';
      headers?: Record<string, string>;
      body?: Record<string, unknown> | FormData | Blob;
      params?: Record<string, string | string[]>;
    }): Promise<T> {
      return this.makeRequest<T>(endpoint, options);
    }

    configureRefresh(handler: (refreshJwt: string) => Promise<BlueskySession>) {
      this.setRefreshSessionHandler(handler);
    }

    async callMakeAuthenticatedRequest<T>(
      endpoint: string,
      options?: {
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
      },
    ): Promise<T> {
      return this.makeAuthenticatedRequest<T>(endpoint, options);
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
        params?: Record<string, string | string[]>;
      };
    };

    public response: unknown;

    constructor(options?: BlueskyApiClientOptions) {
      super('https://pds.example', options);
    }

    async callUploadBlob(blob: Blob, mimeType: string) {
      return this.uploadBlob(blob, mimeType);
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      options: {
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        body?: Blob;
        params?: Record<string, string | string[]>;
      } = {},
    ): Promise<T> {
      const session = this.requireSession();
      this.lastCall = { endpoint, accessJwt: session.accessJwt, options };
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

  it('normalizes and updates the PDS URL when changed', async () => {
    let capturedUrl: string | null = null;

    server.use(
      http.get('https://next.pds/xrpc/test.endpoint', async ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ success: true });
      }),
    );

    const client = new TestClient();
    client.setPdsUrl('https://next.pds/xrpc/');

    await client.callMakeRequest('/test.endpoint');

    expect(capturedUrl).toBe('https://next.pds/xrpc/test.endpoint');
  });

  it('throws when no PDS URL has been configured', async () => {
    const client = new TestClient();
    client.clearPdsUrl();

    await expect(client.callMakeRequest('/test.endpoint')).rejects.toThrow(
      'A Bluesky PDS URL has not been configured. Call setPdsUrl() first.',
    );
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
    const session = createSession({ accessJwt: 'token-123' });
    client.useSession(session);
    await client.callMakeAuthenticatedRequest('/secure', {
      params: { cursor: 'abc' },
    });

    expect(capturedRequest).not.toBeNull();
    const request = capturedRequest!;
    expect(request.url).toBe('https://pds.example/xrpc/secure?cursor=abc');
    expect(request.method).toBe('GET');
    expect(request.headers.authorization).toBe('Bearer token-123');
  });

  it('refreshes expired sessions automatically', async () => {
    const refreshedSession: BlueskySession = {
      handle: 'user.test',
      did: 'did:plc:123',
      active: true,
      accessJwt: 'access-new',
      refreshJwt: 'refresh-new',
    };

    const refreshSession = jest.fn().mockResolvedValue(refreshedSession);
    const session = createSession({ accessJwt: 'access-expired', refreshJwt: 'refresh-old' });

    const headersPerCall: Record<string, string>[] = [];
    let callCount = 0;

    server.use(
      http.get('https://pds.example/xrpc/secure', async ({ request }) => {
        callCount += 1;
        headersPerCall.push(Object.fromEntries(request.headers.entries()));

        if (callCount === 1) {
          return HttpResponse.json({ message: 'Expired' }, { status: 401 });
        }

        return HttpResponse.json({ ok: true });
      }),
    );

    const client = new TestClient();
    client.useSession(session);
    client.configureRefresh(refreshSession);
    const listener = jest.fn();
    client.onSessionChange(listener);

    const result = await client.callMakeAuthenticatedRequest<{ ok: boolean }>(
      '/secure',
    );

    expect(result).toEqual({ ok: true });
    expect(callCount).toBe(2);
    expect(headersPerCall[0].authorization).toBe('Bearer access-expired');
    expect(headersPerCall[1].authorization).toBe('Bearer access-new');
    expect(refreshSession).toHaveBeenCalledWith('refresh-old');
    expect(client.getSession()).toEqual(refreshedSession);
    expect(listener).toHaveBeenCalledWith(refreshedSession);
  });

  it('reuses refreshed tokens from another request without invoking the refresh handler twice', async () => {
    const initialSession = createSession({ accessJwt: 'expired', refreshJwt: 'refresh-old' });
    const updatedSession = createSession({ accessJwt: 'new-access', refreshJwt: 'refresh-new' });
    const refreshSession = jest.fn().mockResolvedValue(updatedSession);

    let client: TestClient;
    const headersPerCall: Record<string, string>[] = [];
    let callCount = 0;

    server.use(
      http.get('https://pds.example/xrpc/secure', async ({ request }) => {
        callCount += 1;
        headersPerCall.push(Object.fromEntries(request.headers.entries()));

        if (callCount === 1) {
          client.useSession(updatedSession);
          return HttpResponse.json({ message: 'Expired' }, { status: 401 });
        }

        return HttpResponse.json({ ok: true });
      }),
    );

    client = new TestClient();
    client.useSession(initialSession);
    client.configureRefresh(refreshSession);

    const result = await client.callMakeAuthenticatedRequest<{ ok: boolean }>('/secure');

    expect(result).toEqual({ ok: true });
    expect(callCount).toBe(2);
    expect(refreshSession).not.toHaveBeenCalled();
    expect(headersPerCall[0].authorization).toBe('Bearer expired');
    expect(headersPerCall[1].authorization).toBe('Bearer new-access');
  });

  it('rethrows when session refresh fails', async () => {
    const refreshError = new Error('refresh failed');
    const refreshSession = jest.fn().mockRejectedValue(refreshError);
    const session = createSession({ accessJwt: 'expired', refreshJwt: 'refresh-token' });

    server.use(
      http.get('https://pds.example/xrpc/secure', () =>
        HttpResponse.json({ message: 'Expired' }, { status: 401 }),
      ),
    );

    const client = new TestClient();
    client.useSession(session);
    client.configureRefresh(refreshSession);

    await expect(
      client.callMakeAuthenticatedRequest('/secure'),
    ).rejects.toThrow(refreshError);
    expect(refreshSession).toHaveBeenCalledWith('refresh-token');
  });

  it('appends array query parameters as repeated entries', async () => {
    let capturedUrl: string | null = null;

    server.use(
      http.get('https://pds.example/xrpc/list', async ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({});
      }),
    );

    const client = new TestClient();
    await client.callMakeRequest('/list', { params: { feeds: ['one', 'two'] } });

    expect(capturedUrl).toBe('https://pds.example/xrpc/list?feeds=one&feeds=two');
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
    const session = createSession({ accessJwt: 'jwt-token' });
    client.useSession(session);
    const result = await client.callUploadBlob(blob, 'image/png');

    expect(result).toEqual(response);
    expect(client.lastCall).toBeDefined();
    expect(client.lastCall?.endpoint).toBe('/com.atproto.repo.uploadBlob');
    expect(client.lastCall?.accessJwt).toBe('jwt-token');
    expect(client.lastCall?.options.headers).toEqual({ 'Content-Type': 'image/png' });
    expect(client.lastCall?.options.body).toBeInstanceOf(Blob);
    expect(client.lastCall?.options.body?.type).toBe('image/png');
  });
});
