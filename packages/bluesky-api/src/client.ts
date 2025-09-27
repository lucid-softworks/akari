import type { BlueskyError, BlueskySession, BlueskyUploadBlobResponse } from './types';

/**
 * Error thrown when a Bluesky request fails
 */
export class BlueskyRequestError extends Error {
  /** HTTP status code returned by the PDS */
  readonly status: number;

  /** Optional AT Protocol error code */
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'BlueskyRequestError';
    this.status = status;
    this.code = code;
  }
}

export type BlueskyApiClientOptions = {
  /**
   * Callback invoked when an authenticated request fails due to an expired or invalid token.
   * Should return a fresh access token that will be retried against the original request.
   * Returning null signals that the request should not be retried.
   */
  onUnauthorized?: (error: BlueskyRequestError) => Promise<string | null>;

  /**
   * Optional provider that returns the refresh token associated with the current session.
   * Used by higher-level clients to negotiate fresh sessions when authentication expires.
   */
  getRefreshToken?: () => Promise<string | null> | string | null;

  /**
   * Listener invoked after a successful session refresh so callers can persist updated tokens.
   */
  onSessionRefreshed?: (session: BlueskySession) => Promise<void> | void;

  /**
   * Custom predicate to decide if an error should trigger the unauthorized retry flow.
   */
  isUnauthorizedError?: (error: BlueskyRequestError) => boolean;
};

/**
 * Bluesky API client for interacting with Bluesky Personal Data Servers (PDS)
 */
export class BlueskyApiClient {
  protected baseUrl: string;
  protected onUnauthorized?: (error: BlueskyRequestError) => Promise<string | null>;
  protected isUnauthorizedError: (error: BlueskyRequestError) => boolean;

  /**
   * Creates a new BlueskyApiClient instance
   * @param pdsUrl - The PDS URL to use (required)
   */
  constructor(pdsUrl: string, options: BlueskyApiClientOptions = {}) {
    this.baseUrl = pdsUrl;
    this.onUnauthorized = options.onUnauthorized;
    this.isUnauthorizedError = options.isUnauthorizedError ?? ((error) => error.status === 401);
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

    const defaultHeaders: Record<string, string> = {};

    if (!(body instanceof FormData) && !(body instanceof Blob)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const requestOptions: RequestInit = {
      method,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    };

    if (body) {
      requestOptions.body = body instanceof FormData || body instanceof Blob ? body : JSON.stringify(body);
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      try {
        const error: BlueskyError = await response.json();
        throw new BlueskyRequestError(
          error.message || `Request failed with status ${response.status}`,
          response.status,
          error.error,
        );
      } catch (parseError) {
        if (parseError instanceof BlueskyRequestError) {
          throw parseError;
        }
        throw new BlueskyRequestError(
          `HTTP ${response.status}: ${response.statusText || 'Request failed'}`,
          response.status,
        );
      }
    }

    return await response.json();
  }

  /**
   * Makes an authenticated request with JWT token
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
    const makeCall = async (token: string) =>
      this.makeRequest<T>(endpoint, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

    try {
      return await makeCall(accessJwt);
    } catch (error) {
      if (
        error instanceof BlueskyRequestError &&
        this.onUnauthorized &&
        this.isUnauthorizedError(error)
      ) {
        const nextToken = await this.onUnauthorized(error);
        if (nextToken) {
          return await makeCall(nextToken);
        }
      }
      throw error;
    }
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
    // Get the blob data as array buffer and create a new blob with correct MIME type
    const arrayBuffer = await blob.arrayBuffer();
    const typedBlob = new Blob([arrayBuffer], { type: mimeType });

    const result = await this.makeAuthenticatedRequest<BlueskyUploadBlobResponse>(
      '/com.atproto.repo.uploadBlob',
      accessJwt,
      {
        method: 'POST',
        body: typedBlob,
        headers: {
          'Content-Type': mimeType,
        },
      },
    );

    return result;
  }
}
