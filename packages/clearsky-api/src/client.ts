import type { ClearSkyError, ClearSkyRequestOptions } from './types';

/**
 * ClearSky API client for interacting with ClearSky services
 */
export class ClearSkyApiClient {
  protected baseUrl: string;

  /**
   * Creates a new ClearSkyApiClient instance
   * @param baseUrl - The base URL for the ClearSky API (defaults to https://api.clearsky.services)
   */
  constructor(baseUrl: string = 'https://api.clearsky.services') {
    this.baseUrl = baseUrl;
  }

  /**
   * Makes a request to the ClearSky API
   * @param endpoint - The API endpoint path
   * @param options - Request options
   * @returns Promise resolving to the response data
   */
  protected async makeRequest<T>(endpoint: string, options: ClearSkyRequestOptions = {}): Promise<T> {
    const url = this.buildUrl(endpoint, options.queryParameters);
    const requestOptions = this.buildRequestOptions(options);

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return await response.json();
  }

  /**
   * Builds the complete URL with query parameters
   */
  private buildUrl(endpoint: string, queryParameters?: Record<string, string | null>): string {
    const url = `${this.baseUrl}${endpoint}`;

    if (!queryParameters || Object.keys(queryParameters).length === 0) {
      return url;
    }

    const searchParameters = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParameters)) {
      if (value !== undefined && value !== null) {
        searchParameters.append(key, value);
      }
    }

    return `${url}?${searchParameters.toString()}`;
  }

  /**
   * Builds the fetch request options
   */
  private buildRequestOptions(options: ClearSkyRequestOptions): RequestInit {
    const { method = 'GET', headers = {}, body } = options;

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      requestOptions.body = this.serializeBody(body);
    }

    return requestOptions;
  }

  /**
   * Serializes the request body appropriately
   */
  private serializeBody(body: Record<string, unknown> | FormData | Blob): BodyInit {
    if (body instanceof FormData || body instanceof Blob) {
      return body;
    }
    return JSON.stringify(body);
  }

  /**
   * Handles HTTP error responses
   */
  private async handleError(response: Response): Promise<Error> {
    let error: ClearSkyError;

    try {
      error = await response.json();
    } catch {
      error = {
        error: 'HTTP_ERROR',
        message: `Request failed with status ${response.status}`,
        status: response.status,
      };
    }

    return new Error(error.message || `Request failed with status ${response.status}`);
  }

  /**
   * Makes a GET request to the ClearSky API
   * @param endpoint - The API endpoint path
   * @param queryParameters - Query parameters
   * @returns Promise resolving to the response data
   */
  protected async get<T>(endpoint: string, queryParameters?: Record<string, string | null>): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'GET',
      queryParameters,
    });
  }

  /**
   * Makes a POST request to the ClearSky API
   * @param endpoint - The API endpoint path
   * @param body - Request body
   * @param queryParameters - Query parameters
   * @returns Promise resolving to the response data
   */
  protected async post<T>(
    endpoint: string,
    body?: Record<string, unknown>,
    queryParameters?: Record<string, string | null>,
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body,
      queryParameters,
    });
  }
}
