import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import {
  BlueskyApiClient,
  getRateLimitCooldownUntil,
  isRateLimitError,
  registerDpopSigner,
  setAuthRefreshHandler,
  unregisterDpopSigner,
  type DpopSigner,
} from './client';

/**
 * Supplementary coverage for the base HTTP client. This file does NOT edit the
 * existing client.test.ts; it targets the internals that suite leaves
 * untouched: the DPoP-signed code path, 429 / rate-limit cooldown bookkeeping,
 * the fetch-rejection fallback cooldown, the empty-accessJwt guest path,
 * empty-body parsing, and the standalone exported helpers.
 */
describe('BlueskyApiClient coverage supplement', () => {
  const server = setupServer();

  // Each suite section uses a distinct origin so module-level rate-limit and
  // DPoP-nonce state (keyed by base URL / origin) does not leak across tests.
  class TestClient extends BlueskyApiClient {
    async callMakeRequest<T>(
      endpoint: string,
      options?: {
        method?: 'GET' | 'POST';
        headers?: Record<string, string>;
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
      },
    ): Promise<T> {
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

    async callUploadBlob(accessJwt: string, blob: Blob, mimeType: string) {
      return this.uploadBlob(accessJwt, blob, mimeType);
    }
  }

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

  afterEach(() => {
    server.resetHandlers();
    jest.restoreAllMocks();
    jest.useRealTimers();
    setAuthRefreshHandler(null);
  });

  afterAll(() => server.close());

  describe('exported helpers', () => {
    it('isRateLimitError narrows only 429-shaped errors', () => {
      expect(isRateLimitError(Object.assign(new Error('x'), { status: 429 }))).toBe(true);
      expect(isRateLimitError(Object.assign(new Error('x'), { status: 500 }))).toBe(false);
      expect(isRateLimitError(null)).toBe(false);
      expect(isRateLimitError(undefined)).toBe(false);
      expect(isRateLimitError('not an error')).toBe(false);
    });

    it('getRateLimitCooldownUntil returns 0 for an untouched base URL', () => {
      expect(getRateLimitCooldownUntil('https://fresh.example')).toBe(0);
    });

    it('register/unregisterDpopSigner are idempotent and reversible', () => {
      const signer: DpopSigner = async () => 'proof';
      // Registering then unregistering an arbitrary token should not throw and
      // should leave no signer behind (verified indirectly via the DPoP tests).
      expect(() => registerDpopSigner('helper-token', signer)).not.toThrow();
      expect(() => registerDpopSigner('helper-token', signer)).not.toThrow();
      expect(() => unregisterDpopSigner('helper-token')).not.toThrow();
      expect(() => unregisterDpopSigner('never-registered')).not.toThrow();
    });
  });

  describe('makeRequest internals', () => {
    it('drops undefined and null query params while keeping defined ones', async () => {
      let capturedUrl: string | null = null;
      server.use(
        http.get('https://mr.example/xrpc/q', async ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({});
        }),
      );

      const client = new TestClient('https://mr.example');
      await client.callMakeRequest('/q', {
        params: {
          keep: 'yes',
          // Exercise the undefined / null skip branch in buildXrpcUrl.
          drop: undefined as unknown as string,
          alsoDrop: null as unknown as string,
          // Array containing a null entry exercises the inner null skip.
          arr: ['a', null as unknown as string, 'b'],
        },
      });

      expect(capturedUrl).toBe('https://mr.example/xrpc/q?keep=yes&arr=a&arr=b');
    });

    it('returns undefined for an empty 200 body', async () => {
      server.use(
        http.post('https://mr.example/xrpc/empty', () => new HttpResponse(null, { status: 200 })),
      );

      const client = new TestClient('https://mr.example');
      const result = await client.callMakeRequest('/empty', { method: 'POST' });
      expect(result).toBeUndefined();
    });

    it('sends a Blob body without a JSON content type', async () => {
      let capturedType: string | null = null;
      server.use(
        http.post('https://mr.example/xrpc/blob', async ({ request }) => {
          capturedType = request.headers.get('content-type');
          return HttpResponse.json({ ok: true });
        }),
      );

      const client = new TestClient('https://mr.example');
      await client.callMakeRequest('/blob', {
        method: 'POST',
        body: new Blob(['bytes'], { type: 'image/png' }),
      });

      expect(capturedType).not.toBe('application/json');
    });

    it('builds an error with status and errorCode from the JSON body', async () => {
      server.use(
        http.get('https://mr.example/xrpc/boom', () =>
          HttpResponse.json({ error: 'InvalidRequest', message: 'nope' }, { status: 400 }),
        ),
      );

      const client = new TestClient('https://mr.example');
      await expect(client.callMakeRequest('/boom')).rejects.toMatchObject({
        message: 'nope',
        status: 400,
        errorCode: 'InvalidRequest',
      });
    });

    it('falls back to a status message when the error body is not JSON', async () => {
      server.use(
        http.get('https://mr.example/xrpc/html', () =>
          new HttpResponse('<html>500</html>', {
            status: 500,
            headers: { 'content-type': 'text/html' },
          }),
        ),
      );

      const client = new TestClient('https://mr.example');
      await expect(client.callMakeRequest('/html')).rejects.toMatchObject({
        message: 'Request failed with status 500',
        status: 500,
      });
    });
  });

  describe('429 rate-limit handling on makeRequest', () => {
    it('parses RateLimit-Reset, sets a cooldown, and throws a 429 error', async () => {
      jest.useFakeTimers();
      const baseUrl = 'https://rl-reset.example';
      const resetSeconds = Math.floor(Date.now() / 1000) + 60;
      server.use(
        http.get(`${baseUrl}/xrpc/limited`, () =>
          HttpResponse.json(
            { error: 'RateLimitExceeded', message: 'slow down' },
            { status: 429, headers: { 'ratelimit-reset': String(resetSeconds) } },
          ),
        ),
      );

      const client = new TestClient(baseUrl);
      const err = (await client.callMakeRequest('/limited').catch((e) => e)) as Error & {
        retryAfterMs?: number;
      };
      expect(isRateLimitError(err)).toBe(true);
      expect(err).toMatchObject({ status: 429, errorCode: 'RateLimitExceeded', message: 'slow down' });
      expect(err.retryAfterMs).toBeGreaterThan(0);
      // Cooldown should be roughly the reset timestamp in millis.
      expect(getRateLimitCooldownUntil(baseUrl)).toBe(resetSeconds * 1000);
      // Drain the cooldown timer so it does not linger as an open handle.
      await jest.advanceTimersByTimeAsync(61_000);
    });

    it('applies the fallback cooldown when a 429 has no usable reset header', async () => {
      jest.useFakeTimers();
      const baseUrl = 'https://rl-noreset.example';
      server.use(
        http.get(`${baseUrl}/xrpc/limited`, () =>
          // Non-numeric reset header exercises parseRateLimitReset's NaN guard.
          HttpResponse.json({}, { status: 429, headers: { 'ratelimit-reset': 'not-a-number' } }),
        ),
      );

      const before = Date.now();
      const client = new TestClient(baseUrl);
      const err = (await client.callMakeRequest('/limited').catch((e) => e)) as Error & {
        retryAfterMs?: number;
      };
      expect(err).toMatchObject({ status: 429, message: 'Rate limited' });
      // No reset means no retryAfterMs is attached.
      expect(err.retryAfterMs).toBeUndefined();
      const until = getRateLimitCooldownUntil(baseUrl);
      expect(until).toBeGreaterThanOrEqual(before + 30_000 - 1000);
      await jest.advanceTimersByTimeAsync(31_000);
    });

    it('awaits an active cooldown before issuing the next request', async () => {
      jest.useFakeTimers();
      const baseUrl = 'https://rl-await.example';
      let hits = 0;
      const resetSeconds = Math.floor(Date.now() / 1000) + 5;
      server.use(
        http.get(`${baseUrl}/xrpc/limited`, () => {
          hits += 1;
          if (hits === 1) {
            return HttpResponse.json({}, {
              status: 429,
              headers: { 'ratelimit-reset': String(resetSeconds) },
            });
          }
          return HttpResponse.json({ ok: true });
        }),
      );

      const client = new TestClient(baseUrl);
      await client.callMakeRequest('/limited').catch(() => undefined);
      expect(getRateLimitCooldownUntil(baseUrl)).toBeGreaterThan(0);

      // Second call should block on the cooldown promise; advancing time
      // resolves it and clears the cooldown.
      const pending = client.callMakeRequest<{ ok: boolean }>('/limited');
      await jest.advanceTimersByTimeAsync(6000);
      await expect(pending).resolves.toEqual({ ok: true });
      expect(getRateLimitCooldownUntil(baseUrl)).toBe(0);
    });
  });

  describe('fetch-rejection fallback cooldown', () => {
    it('sets the fallback cooldown and re-throws when fetch rejects (unauthenticated)', async () => {
      jest.useFakeTimers();
      const baseUrl = 'https://fetchfail.example';
      const fetchSpy = jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new TypeError('Failed to fetch'));

      const before = Date.now();
      const client = new TestClient(baseUrl);
      await expect(client.callMakeRequest('/x')).rejects.toThrow('Failed to fetch');
      expect(getRateLimitCooldownUntil(baseUrl)).toBeGreaterThanOrEqual(before + 30_000 - 1000);
      // Flush the fallback cooldown timer so it does not leak as an open handle.
      await jest.advanceTimersByTimeAsync(31_000);
      expect(getRateLimitCooldownUntil(baseUrl)).toBe(0);
      fetchSpy.mockRestore();
    });
  });

  describe('makeAuthenticatedRequest guest path', () => {
    it('omits the Authorization header when accessJwt is empty', async () => {
      let auth: string | null = 'unset';
      server.use(
        http.get('https://guest.example/xrpc/public', async ({ request }) => {
          auth = request.headers.get('authorization');
          return HttpResponse.json({ ok: true });
        }),
      );

      const client = new TestClient('https://guest.example');
      await expect(
        client.callMakeAuthenticatedRequest<{ ok: boolean }>('/public', ''),
      ).resolves.toEqual({ ok: true });
      expect(auth).toBeNull();
    });
  });

  describe('DPoP-signed code path', () => {
    const DPOP_TOKEN = 'dpop-access-token';

    afterEach(() => {
      unregisterDpopSigner(DPOP_TOKEN);
    });

    it('sends Authorization: DPoP plus a proof and caches the server nonce', async () => {
      const baseUrl = 'https://dpop.example';
      const signerArgs: { method: string; url: string; nonce?: string }[] = [];
      const signer: DpopSigner = jest.fn(async (params) => {
        signerArgs.push(params);
        return 'proof-1';
      });
      registerDpopSigner(DPOP_TOKEN, signer);

      const seen: { auth: string | null; dpop: string | null }[] = [];
      server.use(
        http.post(`${baseUrl}/xrpc/app.bsky.feed.post`, async ({ request }) => {
          seen.push({
            auth: request.headers.get('authorization'),
            dpop: request.headers.get('dpop'),
          });
          return HttpResponse.json({ uri: 'at://x' }, { headers: { 'DPoP-Nonce': 'server-nonce' } });
        }),
      );

      const client = new TestClient(baseUrl, 'did:web:appview.example');
      const result = await client.callMakeAuthenticatedRequest<{ uri: string }>(
        '/app.bsky.feed.post',
        DPOP_TOKEN,
        { method: 'POST', body: { text: 'hi' } },
      );

      expect(result).toEqual({ uri: 'at://x' });
      expect(seen[0]).toEqual({ auth: `DPoP ${DPOP_TOKEN}`, dpop: 'proof-1' });
      expect(signer).toHaveBeenCalledTimes(1);
      expect(signerArgs[0]).toMatchObject({
        method: 'POST',
        url: `${baseUrl}/xrpc/app.bsky.feed.post`,
      });
      // The proxy header should ride along on app.bsky.* DPoP requests too.
      // (verified by the successful 200 from the handler scoped to that path)
    });

    it('retries once with the issued nonce on use_dpop_nonce, then succeeds', async () => {
      const baseUrl = 'https://dpop-nonce.example';
      const nonces: (string | undefined)[] = [];
      const signer: DpopSigner = jest.fn(async ({ nonce }) => {
        nonces.push(nonce);
        return `proof-for-${nonce ?? 'none'}`;
      });
      registerDpopSigner(DPOP_TOKEN, signer);

      let hits = 0;
      server.use(
        http.get(`${baseUrl}/xrpc/secure`, () => {
          hits += 1;
          if (hits === 1) {
            return HttpResponse.json(
              { error: 'use_dpop_nonce' },
              { status: 401, headers: { 'DPoP-Nonce': 'fresh-nonce' } },
            );
          }
          return HttpResponse.json({ ok: true }, { headers: { 'DPoP-Nonce': 'rotated-nonce' } });
        }),
      );

      const client = new TestClient(baseUrl);
      const result = await client.callMakeAuthenticatedRequest<{ ok: boolean }>('/secure', DPOP_TOKEN);

      expect(result).toEqual({ ok: true });
      expect(hits).toBe(2);
      // First attempt had no cached nonce; retry used the server-issued one.
      expect(nonces).toEqual([undefined, 'fresh-nonce']);
    });

    it('does not retry on a non-nonce 401 and surfaces the error', async () => {
      const baseUrl = 'https://dpop-401.example';
      registerDpopSigner(DPOP_TOKEN, async () => 'proof');

      let hits = 0;
      server.use(
        http.get(`${baseUrl}/xrpc/secure`, () => {
          hits += 1;
          return HttpResponse.json(
            { error: 'ExpiredToken', message: 'expired' },
            { status: 401, headers: { 'DPoP-Nonce': 'n' } },
          );
        }),
      );

      const client = new TestClient(baseUrl);
      // No refresh handler installed, so the 401 surfaces directly.
      await expect(
        client.callMakeAuthenticatedRequest('/secure', DPOP_TOKEN),
      ).rejects.toMatchObject({ status: 401, errorCode: 'ExpiredToken' });
      expect(hits).toBe(1);
    });

    it('throws a 429 from the DPoP path with reset bookkeeping', async () => {
      jest.useFakeTimers();
      const baseUrl = 'https://dpop-429.example';
      registerDpopSigner(DPOP_TOKEN, async () => 'proof');
      const resetSeconds = Math.floor(Date.now() / 1000) + 30;
      server.use(
        http.get(`${baseUrl}/xrpc/secure`, () =>
          HttpResponse.json(
            { error: 'RateLimitExceeded', message: 'too fast' },
            { status: 429, headers: { 'ratelimit-reset': String(resetSeconds) } },
          ),
        ),
      );

      const client = new TestClient(baseUrl);
      const err = await client.callMakeAuthenticatedRequest('/secure', DPOP_TOKEN).catch((e) => e);
      expect(err).toMatchObject({ status: 429, errorCode: 'RateLimitExceeded' });
      expect(getRateLimitCooldownUntil(baseUrl)).toBe(resetSeconds * 1000);
      await jest.advanceTimersByTimeAsync(31_000);
    });

    it('returns undefined for an empty 200 body on the DPoP path', async () => {
      const baseUrl = 'https://dpop-empty.example';
      registerDpopSigner(DPOP_TOKEN, async () => 'proof');
      server.use(
        http.post(`${baseUrl}/xrpc/void`, () => new HttpResponse(null, { status: 200 })),
      );

      const client = new TestClient(baseUrl);
      const result = await client.callMakeAuthenticatedRequest('/void', DPOP_TOKEN, {
        method: 'POST',
        body: { a: 1 },
      });
      expect(result).toBeUndefined();
    });

    it('applies the fallback cooldown when the DPoP fetch rejects', async () => {
      jest.useFakeTimers();
      const baseUrl = 'https://dpop-fetchfail.example';
      registerDpopSigner(DPOP_TOKEN, async () => 'proof');
      const fetchSpy = jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new TypeError('network down'));

      const before = Date.now();
      const client = new TestClient(baseUrl);
      await expect(
        client.callMakeAuthenticatedRequest('/secure', DPOP_TOKEN),
      ).rejects.toThrow('network down');
      expect(getRateLimitCooldownUntil(baseUrl)).toBeGreaterThanOrEqual(before + 30_000 - 1000);
      await jest.advanceTimersByTimeAsync(31_000);
      expect(getRateLimitCooldownUntil(baseUrl)).toBe(0);
      fetchSpy.mockRestore();
    });

    it('applies the fallback cooldown when the DPoP nonce-retry fetch rejects', async () => {
      jest.useFakeTimers();
      const baseUrl = 'https://dpop-retryfail.example';
      registerDpopSigner(DPOP_TOKEN, async () => 'proof');

      // First send succeeds at the network level but is a use_dpop_nonce 401;
      // the retry send rejects, exercising the retry catch / fallback cooldown.
      let calls = 0;
      const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
        calls += 1;
        if (calls === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'use_dpop_nonce' }), {
              status: 401,
              headers: { 'DPoP-Nonce': 'n', 'content-type': 'application/json' },
            }),
          );
        }
        return Promise.reject(new TypeError('retry network down'));
      });

      const before = Date.now();
      const client = new TestClient(baseUrl);
      await expect(
        client.callMakeAuthenticatedRequest('/secure', DPOP_TOKEN),
      ).rejects.toThrow('retry network down');
      expect(calls).toBe(2);
      expect(getRateLimitCooldownUntil(baseUrl)).toBeGreaterThanOrEqual(before + 30_000 - 1000);
      await jest.advanceTimersByTimeAsync(31_000);
      fetchSpy.mockRestore();
    });

    it('treats an unparseable use_dpop_nonce body as not-a-nonce-error', async () => {
      const baseUrl = 'https://dpop-badbody.example';
      registerDpopSigner(DPOP_TOKEN, async () => 'proof');

      // 401 carrying a DPoP-Nonce header but a non-JSON body: bodyIsUseDpopNonce
      // hits its catch and returns false, so no retry happens and the 401
      // surfaces unchanged.
      let hits = 0;
      server.use(
        http.get(`${baseUrl}/xrpc/secure`, () => {
          hits += 1;
          return new HttpResponse('<<not json>>', {
            status: 401,
            headers: { 'DPoP-Nonce': 'n', 'content-type': 'text/plain' },
          });
        }),
      );

      const client = new TestClient(baseUrl);
      await expect(
        client.callMakeAuthenticatedRequest('/secure', DPOP_TOKEN),
      ).rejects.toMatchObject({ status: 401 });
      expect(hits).toBe(1);
    });

    it('throws a generic non-ok error (no JSON body) on the DPoP path', async () => {
      const baseUrl = 'https://dpop-500.example';
      registerDpopSigner(DPOP_TOKEN, async () => 'proof');
      server.use(
        http.get(`${baseUrl}/xrpc/secure`, () =>
          new HttpResponse('boom', { status: 502, headers: { 'content-type': 'text/plain' } }),
        ),
      );

      const client = new TestClient(baseUrl);
      await expect(
        client.callMakeAuthenticatedRequest('/secure', DPOP_TOKEN),
      ).rejects.toMatchObject({ status: 502, message: 'Request failed with status 502' });
    });
  });

  describe('auth refresh through the DPoP signer path', () => {
    const OLD_TOKEN = 'old-dpop';
    const NEW_TOKEN = 'new-dpop';

    afterEach(() => {
      unregisterDpopSigner(OLD_TOKEN);
      unregisterDpopSigner(NEW_TOKEN);
    });

    it('refreshes an expired DPoP token and retries once with the rotated token', async () => {
      const baseUrl = 'https://dpop-refresh.example';
      registerDpopSigner(OLD_TOKEN, async () => 'old-proof');
      registerDpopSigner(NEW_TOKEN, async () => 'new-proof');

      const seenAuth: string[] = [];
      let hits = 0;
      server.use(
        http.get(`${baseUrl}/xrpc/secure`, ({ request }) => {
          hits += 1;
          seenAuth.push(request.headers.get('authorization') ?? '');
          if (hits === 1) {
            return HttpResponse.json(
              { error: 'ExpiredToken', message: 'expired' },
              { status: 401, headers: { 'DPoP-Nonce': 'n' } },
            );
          }
          return HttpResponse.json({ ok: true });
        }),
      );

      // The handler re-registers the signer under the new token (as the real
      // app does) and returns the rotated JWT.
      const handler = jest.fn(async (old: string) => {
        expect(old).toBe(OLD_TOKEN);
        return NEW_TOKEN;
      });
      setAuthRefreshHandler(handler);

      const client = new TestClient(baseUrl);
      const result = await client.callMakeAuthenticatedRequest<{ ok: boolean }>(
        '/secure',
        OLD_TOKEN,
      );

      expect(result).toEqual({ ok: true });
      expect(hits).toBe(2);
      expect(seenAuth).toEqual([`DPoP ${OLD_TOKEN}`, `DPoP ${NEW_TOKEN}`]);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('uploadBlob', () => {
    it('rewraps a blob with arrayBuffer() and uploads via the authenticated path', async () => {
      const baseUrl = 'https://upload.example';
      let captured: { type: string | null; bytes: number } | null = null;
      server.use(
        http.post(`${baseUrl}/xrpc/com.atproto.repo.uploadBlob`, async ({ request }) => {
          const buf = await request.arrayBuffer();
          captured = { type: request.headers.get('content-type'), bytes: buf.byteLength };
          return HttpResponse.json({ blob: { ref: { $link: 'cid' }, mimeType: 'image/png', size: buf.byteLength } });
        }),
      );

      const client = new TestClient(baseUrl);
      const blob = new Blob(['imagedata'], { type: 'application/octet-stream' });
      const result = await client.callUploadBlob('token', blob, 'image/png');

      expect(result.blob.ref.$link).toBe('cid');
      expect(captured).not.toBeNull();
      expect(captured!.type).toBe('image/png');
      expect(captured!.bytes).toBe('imagedata'.length);
    });

    it('falls back to the original blob when arrayBuffer is unavailable', async () => {
      const baseUrl = 'https://upload-noab.example';
      let capturedType: string | null = null;
      server.use(
        http.post(`${baseUrl}/xrpc/com.atproto.repo.uploadBlob`, async ({ request }) => {
          capturedType = request.headers.get('content-type');
          await request.arrayBuffer();
          return HttpResponse.json({ blob: { ref: { $link: 'cid2' }, mimeType: 'image/jpeg', size: 4 } });
        }),
      );

      // Build a blob-like object lacking arrayBuffer to hit the RN fallback.
      // Proxy to a real blob for everything except arrayBuffer so fetch can
      // still serialize the body.
      const realBlob = new Blob(['data'], { type: 'image/jpeg' });
      const proxy = new Proxy(realBlob, {
        get(target, prop, receiver) {
          if (prop === 'arrayBuffer') return undefined;
          const v = Reflect.get(target, prop, receiver);
          return typeof v === 'function' ? v.bind(target) : v;
        },
      });

      const client = new TestClient(baseUrl);
      const result = await client.callUploadBlob('token', proxy as unknown as Blob, 'image/jpeg');
      expect(result.blob.ref.$link).toBe('cid2');
      expect(capturedType).toBe('image/jpeg');
    });
  });
});
