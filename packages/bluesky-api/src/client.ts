import type { BlueskyError, BlueskySession, BlueskyUploadBlobResponse } from './types';

type SessionListener = (session: BlueskySession) => void;

type BlueskySessionState = {
  session?: BlueskySession;
};

export class BlueskySessionEventTarget {
  private listeners: Set<SessionListener> = new Set();

  on(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(session: BlueskySession): void {
    for (const listener of this.listeners) {
      listener(session);
    }
  }
}

export type BlueskyApiClientOptions = {
  refreshSession?: (refreshJwt: string) => Promise<BlueskySession>;
  sessionEvents?: BlueskySessionEventTarget;
  sessionState?: BlueskySessionState;
};

/**
 * Error thrown when a Bluesky request fails.
 */
export class BlueskyRequestError extends Error {
  public status: number;
  public body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * Authentication context that enables automatic session refresh.
 *
 * Consumers may reuse the same object across requests – the client will mutate
 * {@link accessJwt} and {@link refreshJwt} with the refreshed values after a
 * successful refresh. The {@link onSessionChange} callback receives the full
 * refreshed session payload so applications can persist the new tokens.
 */
export class BlueskyApiClient {
  protected baseUrl: string;
  protected sessionEvents: BlueskySessionEventTarget;
  protected sessionState: BlueskySessionState;
  private refreshSessionHandler?: (refreshJwt: string) => Promise<BlueskySession>;

  /**
   * Creates a new BlueskyApiClient instance
   * @param pdsUrl - The PDS URL to use (required)
   */
  constructor(pdsUrl: string, options: BlueskyApiClientOptions = {}) {
    this.baseUrl = pdsUrl;
    this.sessionEvents = options.sessionEvents ?? new BlueskySessionEventTarget();
    this.sessionState = options.sessionState ?? {};
    this.refreshSessionHandler = options.refreshSession;
  }

  protected setRefreshSessionHandler(refreshSession: (refreshJwt: string) => Promise<BlueskySession>): void {
    this.refreshSessionHandler = refreshSession;
  }

  protected getRefreshSessionHandler(): ((refreshJwt: string) => Promise<BlueskySession>) | undefined {
    return this.refreshSessionHandler;
  }

  protected emitSessionChanged(session: BlueskySession): void {
    this.sessionEvents.emit(session);
  }

  public onSessionChange(listener: SessionListener): () => void {
    return this.sessionEvents.on(listener);
  }

  public useSession(session: BlueskySession): void {
    this.sessionState.session = session;
  }

  public clearSession(): void {
    delete this.sessionState.session;
  }

  public getSession(): BlueskySession | undefined {
    return this.sessionState.session;
  }

  protected requireSession(): BlueskySession {
    const session = this.getSession();

    if (!session) {
      throw new Error('A Bluesky session has not been configured. Call useSession() or login() first.');
    }

    return session;
  }

  protected applySession(session: BlueskySession, emitEvent: boolean): BlueskySession {
    this.useSession(session);

    if (emitEvent) {
      this.emitSessionChanged(session);
    }

    return session;
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

    const requestOptions: RequestInit = {
      method,
      headers: {
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
      let body: unknown = null;
      let message = `Request failed with status ${response.status}`;

      const contentType = response.headers.get('content-type') ?? '';

      try {
        if (contentType.includes('application/json')) {
          body = await response.json();
          const error = body as BlueskyError;
          if (error?.message) {
            message = error.message;
          }
        } else {
          body = await response.text();
          if (typeof body === 'string' && body.trim().length > 0) {
            message = body;
          }
        }
      } catch {
        body = null;
      }

      throw new BlueskyRequestError(message, response.status, body);
    }

    return await response.json();
  }

  /**
   * Makes an authenticated request with JWT token
   * @param endpoint - The API endpoint path
   * @param options - Request options
   * @returns Promise resolving to the response data
   */
  protected async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST';
      body?: Record<string, unknown> | FormData | Blob;
      params?: Record<string, string | string[]>;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const session = this.requireSession();

    const makeAuthenticatedCall = (accessJwt: string) =>
      this.makeRequest<T>(endpoint, {
        ...options,
        headers: {
          Authorization: `Bearer ${accessJwt}`,
          ...options.headers,
        },
      });

    try {
      return await makeAuthenticatedCall(session.accessJwt);
    } catch (error) {
      if (!(error instanceof BlueskyRequestError) || error.status !== 401) {
        throw error;
      }

      const refreshSession = this.getRefreshSessionHandler();

      if (!refreshSession) {
        throw error;
      }

      const latestSession = this.getSession();

      if (!latestSession) {
        throw new Error('Session became unavailable during an authenticated request. Call useSession() before retrying.');
      }

      if (latestSession.accessJwt !== session.accessJwt) {
        return makeAuthenticatedCall(latestSession.accessJwt);
      }

      const refreshedSession = await refreshSession(latestSession.refreshJwt);
      const nextSession = this.applySession(refreshedSession, true);

      return makeAuthenticatedCall(nextSession.accessJwt);
    }
  }

  /**
   * Uploads a blob (image) to the Bluesky API using the active session.
   * @param blob - The blob data to upload
   * @param mimeType - The MIME type of the blob
   * @returns Promise resolving to the uploaded blob reference
   */
  protected async uploadBlob(blob: Blob, mimeType: string): Promise<BlueskyUploadBlobResponse> {
    // Get the blob data as array buffer and create a new blob with correct MIME type
    const arrayBuffer = await blob.arrayBuffer();
    const typedBlob = new Blob([arrayBuffer], { type: mimeType });

    const result = await this.makeAuthenticatedRequest<BlueskyUploadBlobResponse>(
      '/com.atproto.repo.uploadBlob',
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
