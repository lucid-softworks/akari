/**
 * Bluesky session response from the createSession/refreshSession endpoints
 */
type BlueskySession =
  | {
      /** The user's handle (username) */
      handle: string;
      /** The user's Decentralized Identifier (DID) */
      did: string;
      /** User's email address (optional) */
      email?: string;
      /** Whether the email has been confirmed */
      emailConfirmed?: boolean;
      /** Whether email is used as an authentication factor */
      emailAuthFactor?: boolean;
      /** The DID document (optional) */
      didDoc?: any;
      /** Whether the account is active */
      active: true;
      /** JWT access token for API authentication */
      accessJwt: string;
      /** JWT refresh token for renewing the session */
      refreshJwt: string;
    }
  | {
      /** The user's handle (username) */
      handle: string;
      /** The user's Decentralized Identifier (DID) */
      did: string;
      /** User's email address (optional) */
      email?: string;
      /** Whether the email has been confirmed */
      emailConfirmed?: boolean;
      /** Whether email is used as an authentication factor */
      emailAuthFactor?: boolean;
      /** The DID document (optional) */
      didDoc?: any;
      /** Whether the account is active */
      active: false;
      /**
       * Status indicating why the account is not active
       * Possible values: 'takendown', 'suspended', 'deactivated'
       */
      status: "takendown" | "suspended" | "deactivated";
      /** JWT access token for API authentication */
      accessJwt: string;
      /** JWT refresh token for renewing the session */
      refreshJwt: string;
    };

/**
 * Error response from Bluesky API endpoints
 */
type BlueskyError = {
  /** Error type/code */
  error: string;
  /** Human-readable error message */
  message: string;
};

/**
 * Bluesky API client for interacting with Bluesky Personal Data Servers (PDS)
 */
class BlueskyApi {
  private baseUrl: string;

  /**
   * Creates a new BlueskyApi instance
   * @param pdsUrl - Optional custom PDS URL (defaults to bsky.social)
   */
  constructor(pdsUrl?: string) {
    // Default to bsky.social, but allow custom PDS
    this.baseUrl = pdsUrl || "https://bsky.social/xrpc";
  }

  /**
   * Creates a new session with the Bluesky API
   * @param identifier - User's handle or email
   * @param password - App password
   * @returns Promise resolving to session data
   */
  async createSession(
    identifier: string,
    password: string
  ): Promise<BlueskySession> {
    const response = await fetch(
      `${this.baseUrl}/com.atproto.server.createSession`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      }
    );

    if (!response.ok) {
      const error: BlueskyError = await response.json();
      throw new Error(error.message || "Authentication failed");
    }

    const session: BlueskySession = await response.json();
    return session;
  }

  /**
   * Refreshes an existing session using the refresh token
   * @param refreshJwt - The refresh JWT token
   * @returns Promise resolving to new session data
   */
  async refreshSession(refreshJwt: string): Promise<BlueskySession> {
    const response = await fetch(
      `${this.baseUrl}/com.atproto.server.refreshSession`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshJwt}`,
        },
      }
    );

    if (!response.ok) {
      const error: BlueskyError = await response.json();
      throw new Error(error.message || "Session refresh failed");
    }

    const session: BlueskySession = await response.json();
    return session;
  }

  /**
   * Gets a user's profile information
   * @param accessJwt - Valid access JWT token
   * @param did - User's DID to fetch profile for
   * @returns Promise resolving to profile data
   */
  async getProfile(accessJwt: string, did: string) {
    const response = await fetch(
      `${this.baseUrl}/app.bsky.actor.getProfile?actor=${did}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessJwt}`,
        },
      }
    );

    if (!response.ok) {
      const error: BlueskyError = await response.json();
      throw new Error(error.message || "Failed to get profile");
    }

    return await response.json();
  }

  /**
   * Gets the user's timeline feed
   * @param accessJwt - Valid access JWT token
   * @param limit - Number of posts to fetch (default: 20)
   * @returns Promise resolving to timeline data
   */
  async getTimeline(accessJwt: string, limit: number = 20) {
    const response = await fetch(
      `${this.baseUrl}/app.bsky.feed.getTimeline?limit=${limit}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessJwt}`,
        },
      }
    );

    if (!response.ok) {
      const error: BlueskyError = await response.json();
      throw new Error(error.message || "Failed to get timeline");
    }

    return await response.json();
  }

  /**
   * Creates a new BlueskyApi instance with a custom PDS URL
   * @param pdsUrl - The custom PDS URL
   * @returns New BlueskyApi instance
   */
  static createWithPDS(pdsUrl: string): BlueskyApi {
    return new BlueskyApi(pdsUrl);
  }
}

export const blueskyApi = new BlueskyApi();
export { BlueskyApi };
export type { BlueskyError, BlueskySession };
