import type { BlueskyError, BlueskyUploadBlobResponse } from './types';

/**
 * Bluesky API client for interacting with Bluesky Personal Data Servers (PDS)
 */
export class BlueskyApiClient {
  protected baseUrl: string;

  /**
   * Creates a new BlueskyApiClient instance
   * @param pdsUrl - The PDS URL to use (required)
   */
  constructor(pdsUrl: string) {
    this.baseUrl = pdsUrl;
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
      const error: BlueskyError = await response.json();
      throw new Error(error.message || `Request failed with status ${response.status}`);
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
    return this.makeRequest<T>(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessJwt}`,
        ...options.headers,
      },
    });
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
