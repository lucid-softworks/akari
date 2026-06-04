import type { BlueskyError, BlueskyUploadBlobResponse } from './types';

/**
 * Per-request DPoP proof signer for OAuth-authenticated accounts.
 *
 * The app registers one signer per access token via `registerDpopSigner`.
 * When the API client calls `makeAuthenticatedRequest`, it looks up the
 * signer by access token and, when present, takes the DPoP-bound code path
 * instead of `Authorization: Bearer …`.
 *
 * Implementations own the DPoP keypair and embed the access token's `ath`
 * claim themselves; the client only forwards method/url/nonce.
 */
export type DpopSigner = (params: {
  method: 'GET' | 'POST';
  url: string;
  /** Server-issued nonce from a prior response, if any. */
  nonce?: string;
}) => Promise<string>;

const dpopSignersByAccessToken = new Map<string, DpopSigner>();
/**
 * Per-origin DPoP nonce cache. RFC 9449 lets each origin (auth server and
 * resource server) maintain its own nonce stream, so we key by URL origin
 * rather than collapsing them into a single value.
 */
const dpopNoncesByOrigin = new Map<string, string>();

/**
 * App-supplied callback that exchanges an expired access JWT for a fresh one.
 *
 * Returns the new access JWT on success, or `null` when the refresh itself
 * fails (refresh token expired, network error during refresh, account no
 * longer present in storage). On `null` the client surfaces the original
 * 401 to the caller; the handler is expected to clear auth state itself
 * before returning.
 *
 * The handler is responsible for re-registering any DPoP signer under the
 * new access token before returning, so the retry's signer lookup hits.
 */
export type AuthRefreshHandler = (oldAccessJwt: string) => Promise<string | null>;

let authRefreshHandler: AuthRefreshHandler | null = null;

/**
 * Install a global handler that the API client invokes when an authenticated
 * request returns 401 with `ExpiredToken` / `InvalidToken` /
 * `AuthenticationRequired` (atproto XRPC shape) or `invalid_token` (the
 * RFC 6750 OAuth Bearer-token shape — what the atproto OAuth resource server
 * sends back when a DPoP access JWT's `exp` has lapsed). The client retries
 * the request once with the returned access JWT; if the handler returns
 * `null` the original 401 is thrown.
 *
 * Pass `null` to remove the handler.
 */
export function setAuthRefreshHandler(handler: AuthRefreshHandler | null): void {
  authRefreshHandler = handler;
}

/**
 * Register a DPoP signer for `accessJwt`. Subsequent authenticated requests
 * carrying that token will be DPoP-bound. Idempotent — re-registering the
 * same token replaces the prior signer.
 */
export function registerDpopSigner(accessJwt: string, signer: DpopSigner): void {
  dpopSignersByAccessToken.set(accessJwt, signer);
}

/** Drop the signer for `accessJwt`. Subsequent calls fall back to Bearer. */
export function unregisterDpopSigner(accessJwt: string): void {
  dpopSignersByAccessToken.delete(accessJwt);
}

function getCachedDpopNonce(url: string): string | undefined {
  return dpopNoncesByOrigin.get(originOf(url));
}

function cacheDpopNonce(url: string, nonce: string): void {
  dpopNoncesByOrigin.set(originOf(url), nonce);
}

function originOf(url: string): string {
  return new URL(url).origin;
}

/**
 * Match the 401 shapes that mean "this access token won't work anymore" so
 * the auth refresh path fires for them and only them. Network errors,
 * malformed responses, and per-endpoint authorisation failures (403) keep
 * surfacing as the original error to the caller.
 */
function isExpiredTokenError(err: unknown): boolean {
  const e = err as { status?: number; errorCode?: string } | null | undefined;
  if (!e || e.status !== 401) return false;
  return (
    // atproto XRPC error codes
    e.errorCode === 'ExpiredToken' ||
    e.errorCode === 'InvalidToken' ||
    e.errorCode === 'AuthenticationRequired' ||
    // OAuth 2.0 Bearer-token error codes (RFC 6750). The atproto OAuth
    // resource server returns these when the DPoP access JWT's `exp`
    // has lapsed; without matching them here the refresh path never
    // fires for OAuth sessions and Sentry sees raw "\"exp\" claim
    // timestamp check failed" errors out of makeAuthenticatedRequest.
    e.errorCode === 'invalid_token' ||
    e.errorCode === 'expired_token' ||
    e.errorCode === undefined
  );
}

/**
 * Per-base-URL rate-limit cooldown bookkeeping. Two sources feed this:
 *
 *  - A 429 response (the explicit case). atproto returns `RateLimit-Reset`
 *    as a unix-seconds timestamp telling us exactly when the window opens.
 *  - A fetch rejection that *looks* like a hidden 429. atproto's PDS rate
 *    limiter blocks the CORS preflight OPTIONS too, and the rate-limited
 *    error response is missing `Access-Control-Allow-Origin`, so the
 *    browser surfaces it to JS as a CORS error with no readable status.
 *    We can't tell those apart from genuine network errors, so when we
 *    see one during a stream of authenticated calls we apply a
 *    conservative fallback cooldown rather than retrying immediately.
 */
const FALLBACK_COOLDOWN_MS = 30_000;

type RateLimitState = {
  cooldownUntil: number;
  cooldownPromise: Promise<void> | null;
};

const rateLimitStates = new Map<string, RateLimitState>();

function getRateLimitState(baseUrl: string): RateLimitState {
  let s = rateLimitStates.get(baseUrl);
  if (!s) {
    s = { cooldownUntil: 0, cooldownPromise: null };
    rateLimitStates.set(baseUrl, s);
  }
  return s;
}

function setRateLimitCooldown(baseUrl: string, untilMs: number): void {
  const s = getRateLimitState(baseUrl);
  const now = Date.now();
  if (untilMs <= now) return;
  if (s.cooldownUntil >= untilMs) return;
  s.cooldownUntil = untilMs;
  // Replace any prior shorter cooldown promise with a new one whose
  // resolver clears state once the window expires. Concurrent callers
  // all `await s.cooldownPromise` and resume together on resolve.
  s.cooldownPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      if (s.cooldownUntil === untilMs) {
        s.cooldownUntil = 0;
        s.cooldownPromise = null;
      }
      resolve();
    }, untilMs - now);
  });
}

/**
 * Returns `0` when no cooldown is active, otherwise the unix-millis
 * timestamp the cooldown lifts at. Exposed so call sites that want to
 * show "scan paused for rate limit, X seconds remaining" UI can read it.
 */
export function getRateLimitCooldownUntil(baseUrl: string): number {
  return getRateLimitState(baseUrl).cooldownUntil;
}

async function awaitRateLimit(baseUrl: string): Promise<void> {
  const s = getRateLimitState(baseUrl);
  if (s.cooldownPromise) await s.cooldownPromise;
}

function parseRateLimitReset(response: Response): number | null {
  const reset = response.headers.get('ratelimit-reset');
  if (!reset) return null;
  const n = Number.parseInt(reset, 10);
  if (!Number.isFinite(n)) return null;
  // atproto sends seconds-since-epoch; normalize to millis.
  return n * 1000;
}

/**
 * Detects the error shape thrown by this client for HTTP 429 responses.
 * Callers can branch on this to retry-with-backoff vs. surface-to-user.
 */
export function isRateLimitError(err: unknown): err is Error & { status: 429; retryAfterMs?: number } {
  return !!err && (err as { status?: number }).status === 429;
}

async function bodyIsUseDpopNonce(response: Response): Promise<boolean> {
  try {
    const cloned = response.clone();
    const text = await cloned.text();
    if (!text) return false;
    const json = JSON.parse(text) as { error?: string };
    return json.error === 'use_dpop_nonce';
  } catch {
    return false;
  }
}

/**
 * Endpoints under `app.bsky.*` that are served by the user's PDS rather than
 * by an AppView. These must skip the `atproto-proxy` header — proxying them
 * to an alternative AppView returns 404 because the data lives on the repo.
 */
const PDS_SERVED_APP_BSKY_ENDPOINTS = new Set<string>([
  '/app.bsky.actor.getPreferences',
  '/app.bsky.actor.putPreferences',
]);

/**
 * Bluesky API client for interacting with Bluesky Personal Data Servers (PDS)
 */
export class BlueskyApiClient {
  protected baseUrl: string;
  /**
   * Optional AppView proxy target. When set, `app.bsky.*` and `chat.bsky.*`
   * XRPC calls are sent with `atproto-proxy: <did>#bsky_appview` so the user's
   * PDS forwards them to the named AppView (with a service-auth token) instead
   * of its default. PDS-native `com.atproto.*` calls are unaffected — those
   * always serve from the PDS itself. Stored without the `#bsky_appview`
   * fragment; the request path appends it.
   */
  protected appViewProxyDid?: string;

  /**
   * Creates a new BlueskyApiClient instance
   * @param pdsUrl - The PDS URL to use (required)
   * @param appViewProxyDid - DID of the AppView to proxy app.bsky.* requests through (without #service suffix)
   */
  constructor(pdsUrl: string, appViewProxyDid?: string | null) {
    this.baseUrl = pdsUrl;
    this.appViewProxyDid = appViewProxyDid ? appViewProxyDid : undefined;
  }

  /**
   * `app.bsky.*` lexicons are normally served by the AppView, so we proxy
   * them through the user's PDS. A few exceptions live in the same namespace
   * but are served by the PDS itself — most importantly
   * `app.bsky.actor.getPreferences` / `putPreferences`, where the preference
   * blob is stored on the user's repo. Sending those through an alternative
   * AppView (e.g. Blacksky) yields 404, since alt-AppViews don't store
   * per-user preferences.
   *
   * `chat.bsky.*` is intentionally not proxied here either — chat is a
   * separate service (`#bsky_chat`, not `#bsky_appview`) and reusing the
   * AppView proxy DID would point requests at the wrong endpoint.
   */
  private shouldProxyToAppView(endpoint: string): boolean {
    if (!this.appViewProxyDid) return false;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (!path.startsWith('/app.bsky.')) return false;
    if (PDS_SERVED_APP_BSKY_ENDPOINTS.has(path)) return false;
    return true;
  }

  private appViewProxyHeader(endpoint: string): Record<string, string> {
    if (!this.shouldProxyToAppView(endpoint)) return {};
    return { 'atproto-proxy': `${this.appViewProxyDid}#bsky_appview` };
  }

  /**
   * Build the absolute XRPC URL for `endpoint` with `params` merged into
   * the query string. Extracted so the DPoP code path can produce a proof
   * over exactly the URL it will fetch.
   */
  protected buildXrpcUrl(endpoint: string, params?: Record<string, string | string[]>): string {
    let url = `${this.baseUrl}/xrpc${endpoint}`;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item !== undefined && item !== null) {
              searchParams.append(key, item);
            }
          }
        } else {
          searchParams.append(key, value);
        }
      });
      url += `?${searchParams.toString()}`;
    }
    return url;
  }

  /**
   * Makes an authenticated request to the Bluesky API
   * @param endpoint - The API endpoint path
   * @param options - Request options
   * @returns Promise resolving to the response data
   */
  protected async makeRequest<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST';
      headers?: Record<string, string>;
      body?: Record<string, unknown> | FormData | Blob;
      params?: Record<string, string | string[]>;
    } = {},
  ): Promise<T> {
    const { method = 'GET', headers = {}, body, params } = options;

    const url = this.buildXrpcUrl(endpoint, params);

    const requestOptions: RequestInit = {
      method,
      headers: {
        ...this.appViewProxyHeader(endpoint),
        ...headers,
        // Only set Content-Type for JSON, let browser handle FormData and Blob
        ...(body && !(body instanceof FormData) && !(body instanceof Blob) && { 'Content-Type': 'application/json' }),
      },
    };

    if (body) {
      requestOptions.body = body instanceof FormData || body instanceof Blob ? body : JSON.stringify(body);
    }

    await awaitRateLimit(this.baseUrl);

    let response: Response;
    try {
      response = await fetch(url, requestOptions);
    } catch (err) {
      // CORS-disguised 429s and genuine network failures look identical
      // from JS. Apply a conservative cooldown so the next call doesn't
      // hammer the same wall, then re-throw for the caller.
      setRateLimitCooldown(this.baseUrl, Date.now() + FALLBACK_COOLDOWN_MS);
      throw err;
    }

    if (response.status === 429) {
      const resetMs = parseRateLimitReset(response);
      setRateLimitCooldown(this.baseUrl, resetMs ?? Date.now() + FALLBACK_COOLDOWN_MS);
      const errBody: Partial<BlueskyError> = await response.json().catch(() => ({}));
      const err = new Error(errBody.message || 'Rate limited') as Error & {
        status: 429;
        errorCode?: string;
        retryAfterMs?: number;
      };
      err.status = 429;
      if (errBody.error) err.errorCode = errBody.error;
      if (resetMs) err.retryAfterMs = Math.max(0, resetMs - Date.now());
      throw err;
    }

    if (!response.ok) {
      const errBody: Partial<BlueskyError> = await response.json().catch(() => ({}));
      const err = new Error(errBody.message || `Request failed with status ${response.status}`) as Error & {
        status: number;
        errorCode?: string;
      };
      err.status = response.status;
      if (errBody.error) err.errorCode = errBody.error;
      throw err;
    }

    // Some XRPC procedures (e.g. app.bsky.draft.updateDraft, deleteDraft)
    // return 200 with an empty body. `response.json()` throws on those —
    // fall back to undefined so void-returning callers don't crash.
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /**
   * Makes an authenticated request with the access token bound to the
   * current account. When the app has registered a DPoP signer for
   * `accessJwt` (OAuth accounts) we send `Authorization: DPoP …` plus a
   * per-request proof and transparently retry once on `use_dpop_nonce`.
   * Otherwise we fall back to the existing `Authorization: Bearer …`
   * shape used by handle/app-password sessions.
   *
   * If the request fails with an expired-token 401 and an
   * `AuthRefreshHandler` is installed, the request is retried exactly once
   * with the rotated access JWT. The retry skips the refresh path so a
   * still-failing request surfaces the 401 to the caller instead of
   * looping.
   *
   * @param endpoint - The API endpoint path
   * @param accessJwt - Valid access JWT token
   * @param options - Request options
   * @returns Promise resolving to the response data
   */
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
    try {
      return await this.makeAuthenticatedRequestRaw<T>(endpoint, accessJwt, options);
    } catch (err) {
      if (!authRefreshHandler || !isExpiredTokenError(err)) throw err;
      const newAccessJwt = await authRefreshHandler(accessJwt);
      if (!newAccessJwt || newAccessJwt === accessJwt) throw err;
      return this.makeAuthenticatedRequestRaw<T>(endpoint, newAccessJwt, options);
    }
  }

  private async makeAuthenticatedRequestRaw<T>(
    endpoint: string,
    accessJwt: string,
    options: {
      method?: 'GET' | 'POST';
      body?: Record<string, unknown> | FormData | Blob;
      params?: Record<string, string | string[]>;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    // Guest reads: an empty accessJwt means the caller is hitting a
    // public AppView endpoint (e.g. unauthenticated `app.bsky.feed.*`
    // GETs) and there is no session to bind. Skip the Authorization
    // header entirely; per-user endpoints (timeline, notifications,
    // bookmarks, chat, prefs) will still 401 server-side, but the
    // guest-mode hooks gate those at the React Query layer before they
    // ever call here.
    if (accessJwt === '') {
      return this.makeRequest<T>(endpoint, options);
    }

    const signer = dpopSignersByAccessToken.get(accessJwt);
    if (!signer) {
      return this.makeRequest<T>(endpoint, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessJwt}`,
          ...options.headers,
        },
      });
    }

    const { method = 'GET', body, params, headers: callerHeaders = {} } = options;
    const url = this.buildXrpcUrl(endpoint, params);

    const sendOnce = async (nonce: string | undefined): Promise<Response> => {
      const proof = await signer({ method, url, nonce });
      const headers: Record<string, string> = {
        ...this.appViewProxyHeader(endpoint),
        ...callerHeaders,
        Authorization: `DPoP ${accessJwt}`,
        DPoP: proof,
        ...(body && !(body instanceof FormData) && !(body instanceof Blob)
          ? { 'Content-Type': 'application/json' }
          : {}),
      };
      const requestOptions: RequestInit = { method, headers };
      if (body) {
        requestOptions.body =
          body instanceof FormData || body instanceof Blob ? body : JSON.stringify(body);
      }
      return fetch(url, requestOptions);
    };

    await awaitRateLimit(this.baseUrl);

    let response: Response;
    try {
      response = await sendOnce(getCachedDpopNonce(url));
    } catch (err) {
      // CORS-disguised 429 / network failure — back off conservatively.
      setRateLimitCooldown(this.baseUrl, Date.now() + FALLBACK_COOLDOWN_MS);
      throw err;
    }
    const firstResponseNonce = response.headers.get('DPoP-Nonce');
    if (firstResponseNonce) cacheDpopNonce(url, firstResponseNonce);

    if (!response.ok && firstResponseNonce && (await bodyIsUseDpopNonce(response))) {
      try {
        response = await sendOnce(firstResponseNonce);
      } catch (err) {
        setRateLimitCooldown(this.baseUrl, Date.now() + FALLBACK_COOLDOWN_MS);
        throw err;
      }
      const retryNonce = response.headers.get('DPoP-Nonce');
      if (retryNonce) cacheDpopNonce(url, retryNonce);
    }

    if (response.status === 429) {
      const resetMs = parseRateLimitReset(response);
      setRateLimitCooldown(this.baseUrl, resetMs ?? Date.now() + FALLBACK_COOLDOWN_MS);
      const errBody: Partial<BlueskyError> = await response.json().catch(() => ({}));
      const err = new Error(errBody.message || 'Rate limited') as Error & {
        status: 429;
        errorCode?: string;
        retryAfterMs?: number;
      };
      err.status = 429;
      if (errBody.error) err.errorCode = errBody.error;
      if (resetMs) err.retryAfterMs = Math.max(0, resetMs - Date.now());
      throw err;
    }

    if (!response.ok) {
      const errBody: Partial<BlueskyError> = await response.json().catch(() => ({}));
      const err = new Error(errBody.message || `Request failed with status ${response.status}`) as Error & {
        status: number;
        errorCode?: string;
      };
      err.status = response.status;
      if (errBody.error) err.errorCode = errBody.error;
      throw err;
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /**
   * Uploads a blob (image) to the Bluesky API
   * @param accessJwt - Valid access JWT token
   * @param blob - The blob data to upload
   * @param mimeType - The MIME type of the blob
   * @returns Promise resolving to the uploaded blob reference
   */
  protected async uploadBlob(
    accessJwt: string,
    blob: Blob,
    mimeType: string,
  ): Promise<BlueskyUploadBlobResponse> {
    // React Native's Blob polyfill doesn't always implement
    // `arrayBuffer()` (notably for blobs returned by `fetch(file://)`,
    // which is what we get for image / video picks). Fall back to
    // sending the original blob directly when arrayBuffer is missing —
    // we still force the correct MIME via the explicit Content-Type
    // header on the request.
    const hasArrayBuffer =
      blob && typeof (blob as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === 'function';
    const body: Blob = hasArrayBuffer
      ? new Blob([await blob.arrayBuffer()], { type: mimeType })
      : blob;

    const result = await this.makeAuthenticatedRequest<BlueskyUploadBlobResponse>(
      '/com.atproto.repo.uploadBlob',
      accessJwt,
      {
        method: 'POST',
        body,
        headers: {
          'Content-Type': mimeType,
        },
      },
    );

    return result;
  }
}
