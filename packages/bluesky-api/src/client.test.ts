import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { BlueskyApiClient, setAuthRefreshHandler } from './client';

describe('BlueskyApiClient', () => {
  const server = setupServer();

  class TestClient extends BlueskyApiClient {
    constructor(appViewProxyDid?: string | null) {
      super('https://pds.example', appViewProxyDid);
    }

    async callMakeRequest<T>(endpoint: string, options?: {
      method?: 'GET' | 'POST';
      headers?: Record<string, string>;
      body?: Record<string, unknown> | FormData | Blob;
      params?: Record<string, string | string[]>;
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
        params?: Record<string, string | string[]>;
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
        params?: Record<string, string | string[]>;
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
        params?: Record<string, string | string[]>;
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
    setAuthRefreshHandler(null);
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
    // `unknown` because the in-scope FormData global (react-native's, which
    // leaks into this package) types entries loosely; we only assert it's a Blob.
    let capturedFile: unknown = null;

    server.use(
      http.post('https://pds.example/xrpc/upload', async ({ request }) => {
        capturedHeaders = Object.fromEntries(request.headers.entries());
        const formData = await request.formData();
        capturedFile = formData.getAll('file')[0] ?? null;
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
    const result = await client.callUploadBlob('jwt-token', blob, 'image/png');

    expect(result).toEqual(response);
    expect(client.lastCall).toBeDefined();
    expect(client.lastCall?.endpoint).toBe('/com.atproto.repo.uploadBlob');
    expect(client.lastCall?.accessJwt).toBe('jwt-token');
    expect(client.lastCall?.options.headers).toEqual({ 'Content-Type': 'image/png' });
    expect(client.lastCall?.options.body).toBeInstanceOf(Blob);
    expect(client.lastCall?.options.body?.type).toBe('image/png');
  });

  describe('auth refresh interceptor', () => {
    it('refreshes the token and retries once when the response is 401 ExpiredToken', async () => {
      let callCount = 0;
      const seenTokens: string[] = [];
      server.use(
        http.get('https://pds.example/xrpc/secure', async ({ request }) => {
          callCount += 1;
          const auth = request.headers.get('authorization') ?? '';
          seenTokens.push(auth);
          if (callCount === 1) {
            return HttpResponse.json(
              { error: 'ExpiredToken', message: 'Token has expired' },
              { status: 401 },
            );
          }
          return HttpResponse.json({ ok: true });
        }),
      );

      const handler = jest.fn().mockResolvedValue('rotated-token');
      setAuthRefreshHandler(handler);

      const client = new TestClient();
      const result = await client.callMakeAuthenticatedRequest<{ ok: boolean }>(
        '/secure',
        'expired-token',
      );

      expect(result).toEqual({ ok: true });
      expect(callCount).toBe(2);
      expect(seenTokens).toEqual(['Bearer expired-token', 'Bearer rotated-token']);
      expect(handler).toHaveBeenCalledWith('expired-token');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('refreshes on 401 InvalidToken', async () => {
      let callCount = 0;
      server.use(
        http.get('https://pds.example/xrpc/secure', async () => {
          callCount += 1;
          if (callCount === 1) {
            return HttpResponse.json(
              { error: 'InvalidToken', message: 'invalid' },
              { status: 401 },
            );
          }
          return HttpResponse.json({ ok: true });
        }),
      );

      setAuthRefreshHandler(jest.fn().mockResolvedValue('rotated'));
      const client = new TestClient();

      await expect(client.callMakeAuthenticatedRequest('/secure', 'old')).resolves.toEqual({
        ok: true,
      });
    });

    it('refreshes on 401 with no errorCode at all (PDS shape variants)', async () => {
      let callCount = 0;
      server.use(
        http.get('https://pds.example/xrpc/secure', async () => {
          callCount += 1;
          if (callCount === 1) return new HttpResponse(null, { status: 401 });
          return HttpResponse.json({ ok: true });
        }),
      );

      setAuthRefreshHandler(jest.fn().mockResolvedValue('rotated'));
      const client = new TestClient();

      await expect(client.callMakeAuthenticatedRequest('/secure', 'old')).resolves.toEqual({
        ok: true,
      });
    });

    it('does NOT refresh on 403 (forbidden, not auth-expired)', async () => {
      server.use(
        http.get('https://pds.example/xrpc/secure', async () =>
          HttpResponse.json({ error: 'Forbidden' }, { status: 403 }),
        ),
      );

      const handler = jest.fn();
      setAuthRefreshHandler(handler);

      const client = new TestClient();
      await expect(
        client.callMakeAuthenticatedRequest('/secure', 'old'),
      ).rejects.toMatchObject({ status: 403 });
      expect(handler).not.toHaveBeenCalled();
    });

    it('does NOT refresh on a non-auth 401 errorCode (e.g. RateLimitExceeded mistaken for 401)', async () => {
      server.use(
        http.get('https://pds.example/xrpc/secure', async () =>
          HttpResponse.json({ error: 'RateLimitExceeded' }, { status: 401 }),
        ),
      );

      const handler = jest.fn();
      setAuthRefreshHandler(handler);

      const client = new TestClient();
      await expect(client.callMakeAuthenticatedRequest('/secure', 'old')).rejects.toMatchObject({
        status: 401,
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('surfaces the original 401 when the refresh handler returns null', async () => {
      server.use(
        http.get('https://pds.example/xrpc/secure', async () =>
          HttpResponse.json({ error: 'ExpiredToken' }, { status: 401 }),
        ),
      );

      setAuthRefreshHandler(jest.fn().mockResolvedValue(null));

      const client = new TestClient();
      await expect(
        client.callMakeAuthenticatedRequest('/secure', 'old'),
      ).rejects.toMatchObject({ status: 401, errorCode: 'ExpiredToken' });
    });

    it('surfaces the original 401 when the refresh handler returns the same token (no infinite retry)', async () => {
      let callCount = 0;
      server.use(
        http.get('https://pds.example/xrpc/secure', async () => {
          callCount += 1;
          return HttpResponse.json({ error: 'ExpiredToken' }, { status: 401 });
        }),
      );

      setAuthRefreshHandler(jest.fn().mockResolvedValue('same-token'));

      const client = new TestClient();
      await expect(
        client.callMakeAuthenticatedRequest('/secure', 'same-token'),
      ).rejects.toMatchObject({ status: 401 });
      expect(callCount).toBe(1);
    });

    it('does not retry a second time when the rotated token also gets 401', async () => {
      let callCount = 0;
      server.use(
        http.get('https://pds.example/xrpc/secure', async () => {
          callCount += 1;
          return HttpResponse.json({ error: 'ExpiredToken' }, { status: 401 });
        }),
      );

      const handler = jest.fn().mockResolvedValue('rotated');
      setAuthRefreshHandler(handler);

      const client = new TestClient();
      await expect(
        client.callMakeAuthenticatedRequest('/secure', 'old'),
      ).rejects.toMatchObject({ status: 401 });
      expect(callCount).toBe(2);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('surfaces the original 401 when no handler is installed', async () => {
      server.use(
        http.get('https://pds.example/xrpc/secure', async () =>
          HttpResponse.json({ error: 'ExpiredToken' }, { status: 401 }),
        ),
      );

      // Explicitly clear the handler to be sure.
      setAuthRefreshHandler(null);

      const client = new TestClient();
      await expect(
        client.callMakeAuthenticatedRequest('/secure', 'old'),
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('atproto-proxy header', () => {
    it('injects the proxy header on app.bsky.* requests when configured', async () => {
      let capturedHeaders: Record<string, string> | null = null;
      server.use(
        http.get('https://pds.example/xrpc/app.bsky.feed.getTimeline', async ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({});
        }),
      );

      const client = new TestClient('did:web:api.blacksky.community');
      await client.callMakeRequest('/app.bsky.feed.getTimeline');

      expect(capturedHeaders!['atproto-proxy']).toBe('did:web:api.blacksky.community#bsky_appview');
    });

    it('does NOT inject the proxy header on chat.bsky.* requests', async () => {
      // Chat is served by a separate `#bsky_chat` service rather than `#bsky_appview`,
      // so reusing the AppView proxy DID would point chat calls at the wrong endpoint.
      let capturedHeaders: Record<string, string> | null = null;
      server.use(
        http.get('https://pds.example/xrpc/chat.bsky.convo.listConvos', async ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({});
        }),
      );

      const client = new TestClient('did:web:api.blacksky.community');
      await client.callMakeAuthenticatedRequest('/chat.bsky.convo.listConvos', 'token');

      expect(capturedHeaders!['atproto-proxy']).toBeUndefined();
    });

    it('does NOT inject the proxy header on PDS-served app.bsky.actor.getPreferences', async () => {
      // Preferences live on the user's repo (PDS), not on the AppView. Alt-AppViews
      // like Blacksky return 404 for this endpoint, so the rule must skip it.
      let capturedHeaders: Record<string, string> | null = null;
      server.use(
        http.get('https://pds.example/xrpc/app.bsky.actor.getPreferences', async ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({});
        }),
      );

      const client = new TestClient('did:web:api.blacksky.community');
      await client.callMakeAuthenticatedRequest('/app.bsky.actor.getPreferences', 'token');

      expect(capturedHeaders!['atproto-proxy']).toBeUndefined();
    });

    it('does NOT inject the proxy header on PDS-served app.bsky.actor.putPreferences', async () => {
      let capturedHeaders: Record<string, string> | null = null;
      server.use(
        http.post('https://pds.example/xrpc/app.bsky.actor.putPreferences', async ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({});
        }),
      );

      const client = new TestClient('did:web:api.blacksky.community');
      await client.callMakeAuthenticatedRequest('/app.bsky.actor.putPreferences', 'token', {
        method: 'POST',
        body: { preferences: [] },
      });

      expect(capturedHeaders!['atproto-proxy']).toBeUndefined();
    });

    it('does NOT inject the proxy header on com.atproto.* requests', async () => {
      let capturedHeaders: Record<string, string> | null = null;
      server.use(
        http.get('https://pds.example/xrpc/com.atproto.identity.resolveHandle', async ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({});
        }),
      );

      const client = new TestClient('did:web:api.blacksky.community');
      await client.callMakeRequest('/com.atproto.identity.resolveHandle');

      expect(capturedHeaders!['atproto-proxy']).toBeUndefined();
    });

    it('does NOT inject the proxy header when no appViewProxyDid is configured', async () => {
      let capturedHeaders: Record<string, string> | null = null;
      server.use(
        http.get('https://pds.example/xrpc/app.bsky.feed.getTimeline', async ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({});
        }),
      );

      const client = new TestClient();
      await client.callMakeRequest('/app.bsky.feed.getTimeline');

      expect(capturedHeaders!['atproto-proxy']).toBeUndefined();
    });
  });
});
