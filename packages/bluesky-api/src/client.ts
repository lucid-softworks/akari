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

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const body: Partial<BlueskyError> = await response.json().catch(() => ({}));
      const err = new Error(body.message || `Request failed with status ${response.status}`) as Error & {
        status: number;
        errorCode?: string;
      };
      err.status = response.status;
      if (body.error) err.errorCode = body.error;
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

    let response = await sendOnce(getCachedDpopNonce(url));
    const firstResponseNonce = response.headers.get('DPoP-Nonce');
    if (firstResponseNonce) cacheDpopNonce(url, firstResponseNonce);

    if (!response.ok && firstResponseNonce && (await bodyIsUseDpopNonce(response))) {
      response = await sendOnce(firstResponseNonce);
      const retryNonce = response.headers.get('DPoP-Nonce');
      if (retryNonce) cacheDpopNonce(url, retryNonce);
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
