import type { BlueskyError } from "./types";

/**
 * Bluesky API client for interacting with Bluesky Personal Data Servers (PDS)
 */
export class BlueskyApiClient {
  protected baseUrl: string;

  /**
   * Creates a new BlueskyApiClient instance
   * @param pdsUrl - Optional custom PDS URL (defaults to bsky.social)
   */
  constructor(pdsUrl?: string) {
    // Default to bsky.social, but allow custom PDS
    this.baseUrl = pdsUrl || "https://bsky.social/xrpc";
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
      method?: "GET" | "POST";
      headers?: Record<string, string>;
      body?: Record<string, unknown>;
      params?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const { method = "GET", headers = {}, body, params } = options;

    let url = `${this.baseUrl}${endpoint}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value);
        }
      });
      url += `?${searchParams.toString()}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const error: BlueskyError = await response.json();
      throw new Error(
        error.message || `Request failed with status ${response.status}`
      );
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
      method?: "GET" | "POST";
      body?: Record<string, unknown>;
      params?: Record<string, string>;
    } = {}
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessJwt}`,
        // Include labelers to get labels in responses
        "atproto-accept-labelers":
          "did:plc:ar7c4by46qjdydhdevvrndac;redact, did:plc:gvkp7euswjjrctjmqwhhfzif;redact, did:plc:newitj5jo3uel7o4mnf3vj2o, did:plc:pbmxe3tfpkts72wi74weijpo, did:plc:wkoofae5uytcm7bjncmev6n6, did:plc:blwl5jhgk7eygww2bhkt56hg, did:plc:mjyeurqmqjeexbgigk3yytvb, did:plc:i65enriuag7n5fgkopbqtkyk, did:plc:zal76px7lfptnpgn4j3v6i7d, did:plc:wp7hxfjl5l4zlptn7y6774lk, did:plc:xpxsa5aviwecd7cv6bzbmr5n, did:plc:gwqqyezoxusulkn5g2nzd6t2, did:plc:xss2sw5p4bfhjqjorl7gk6z4, did:plc:mtbmlt62wuf454ztne5wacev, did:plc:bfsapbnzx54ypg2mgrflkjlx, did:plc:gclep67kb2bifr3praijwoun, did:plc:aksxl7qy5azlzfm2jstcwqtz, did:plc:yb2gz6yxpebbzlundrrfkv4d, did:plc:vfibt4bgozsdx6rnnnpha3x7",
      },
    });
  }

  /**
   * Creates a new BlueskyApiClient instance with a custom PDS URL
   * @param pdsUrl - The custom PDS URL
   * @returns New BlueskyApiClient instance
   */
  static createWithPDS(pdsUrl: string): BlueskyApiClient {
    return new BlueskyApiClient(pdsUrl);
  }
}
