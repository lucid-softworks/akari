/**
 * Bluesky post view from feed responses
 */
type BlueskyPostView = {
  /** The post's URI */
  uri: string;
  /** The post's CID */
  cid: string;
  /** The post author's information */
  author: {
    did: string;
    handle: string;
    displayName: string;
    avatar: string;
    associated: {
      lists: number;
      feedgens: number;
      starterPacks: number;
      labeler: boolean;
      chat: {
        allowIncoming: string;
      };
    };
    viewer: {
      muted: boolean;
      mutedByList?: any;
      blockedBy: boolean;
      blocking?: string;
      blockingByList?: any;
      following?: string;
      followedBy?: string;
      knownFollowers?: {
        count: number;
        followers: any[];
      };
    };
    labels: any[];
    createdAt: string;
    verification?: {
      verifications: any[];
      verifiedStatus: string;
      trustedVerifierStatus: string;
    };
    status?: {
      status: string;
      record: any;
      embed?: any;
      expiresAt: string;
      isActive: boolean;
    };
  };
  /** The post's record data */
  record: any;
  /** The post's embed data */
  embed?: any;
  /** The post's reply data */
  reply?: {
    root: any;
    parent: any;
    grandparentAuthor?: {
      did: string;
      handle: string;
      displayName: string;
      avatar: string;
      associated: any;
      viewer: any;
      labels: any[];
      createdAt: string;
      verification?: any;
      status?: any;
    };
  };
  /** The post's repost/reason data */
  reason?: {
    by: {
      did: string;
      handle: string;
      displayName: string;
      avatar: string;
      associated: any;
      viewer: any;
      labels: any[];
      createdAt: string;
      verification?: any;
      status?: any;
    };
    indexedAt: string;
  };
  /** When the post was indexed */
  indexedAt: string;
  /** The post's labels */
  labels: any[];
  /** Viewer's interaction with the post */
  viewer?: {
    like?: string;
    repost?: string;
    reply?: string;
  };
  /** The post's thread data */
  thread?: any;
  /** The post's embed data */
  embeds?: any[];
  /** The post's language tags */
  langs?: string[];
  /** The post's facets */
  facets?: any[];
  /** The post's tags */
  tags?: string[];
  /** Number of likes on the post */
  likeCount?: number;
  /** Number of replies on the post */
  replyCount?: number;
  /** Number of reposts on the post */
  repostCount?: number;
};

/**
 * Bluesky feed item (post with context)
 */
type BlueskyFeedItem = {
  /** The post data */
  post: BlueskyPostView;
  /** Reply context if this is a reply */
  reply?: {
    grandparentAuthor?: {
      did: string;
      handle: string;
      displayName: string;
      avatar: string;
      associated: any;
      viewer: any;
      labels: any[];
      createdAt: string;
      verification?: any;
      status?: any;
    };
  };
  /** Repost/reason context if this is a repost */
  reason?: {
    by: {
      did: string;
      handle: string;
      displayName: string;
      avatar: string;
      associated: any;
      viewer: any;
      labels: any[];
      createdAt: string;
      verification?: any;
      status?: any;
    };
    indexedAt: string;
  };
  /** Context provided by feed generator */
  feedContext?: string;
};

/**
 * Response from the getFeed endpoint
 */
type BlueskyFeedResponse = {
  /** Cursor for pagination */
  cursor?: string;
  /** Array of feed items (posts) */
  feed: BlueskyFeedItem[];
};

/**
 * Bluesky feed generator response from the getFeeds endpoint
 */
type BlueskyFeed = {
  /** The feed's URI */
  uri: string;
  /** The feed's CID */
  cid: string;
  /** The feed's DID */
  did: string;
  /** The feed creator's information */
  creator: {
    did: string;
    handle: string;
    displayName: string;
    description: string;
    avatar: string;
    associated: {
      lists: number;
      feedgens: number;
      starterPacks: number;
      labeler: boolean;
      chat: {
        allowIncoming: string;
      };
    };
    indexedAt: string;
    createdAt: string;
    viewer: {
      muted: boolean;
      mutedByList?: any;
      blockedBy: boolean;
      blocking?: string;
      blockingByList?: any;
      following?: string;
      followedBy?: string;
      knownFollowers?: {
        count: number;
        followers: any[];
      };
    };
    labels: any[];
    verification?: {
      verifications: any[];
      verifiedStatus: string;
      trustedVerifierStatus: string;
    };
    status?: {
      status: string;
      record: any;
      embed?: any;
      expiresAt: string;
      isActive: boolean;
    };
  };
  /** The feed's display name */
  displayName: string;
  /** The feed's description */
  description: string;
  /** Description facets for rich text */
  descriptionFacets?: any[];
  /** The feed's avatar URI */
  avatar?: string;
  /** Number of likes on the feed */
  likeCount: number;
  /** Whether the feed accepts interactions */
  acceptsInteractions: boolean;
  /** Labels applied to the feed */
  labels: any[];
  /** Viewer's interaction with the feed */
  viewer?: {
    like?: string;
  };
  /** Content mode for the feed */
  contentMode:
    | "app.bsky.feed.defs#contentModeUnspecified"
    | "app.bsky.feed.defs#contentModeVideo";
  /** When the feed was indexed */
  indexedAt: string;
};

/**
 * Response from the getFeeds endpoint
 */
type BlueskyFeedsResponse = {
  /** Cursor for pagination */
  cursor?: string;
  /** Array of feeds */
  feeds: BlueskyFeed[];
};

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
   * Gets feed generators (feeds) created by an actor
   * @param accessJwt - Valid access JWT token
   * @param actor - The actor's DID or handle
   * @param limit - Number of feeds to fetch (default: 50, max: 100)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to feeds data
   */
  async getFeeds(
    accessJwt: string,
    actor: string,
    limit: number = 50,
    cursor?: string
  ): Promise<BlueskyFeedsResponse> {
    const params = new URLSearchParams({
      actor,
      limit: limit.toString(),
    });

    if (cursor) {
      params.append("cursor", cursor);
    }

    const response = await fetch(
      `${this.baseUrl}/app.bsky.feed.getActorFeeds?${params}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessJwt}`,
        },
      }
    );

    if (!response.ok) {
      const error: BlueskyError = await response.json();
      throw new Error(error.message || "Failed to get feeds");
    }

    return await response.json();
  }

  /**
   * Gets posts from a specific feed generator
   * @param accessJwt - Valid access JWT token
   * @param feed - The feed's URI
   * @param limit - Number of posts to fetch (default: 50, max: 100)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to feed posts data
   */
  async getFeed(
    accessJwt: string,
    feed: string,
    limit: number = 50,
    cursor?: string
  ): Promise<BlueskyFeedResponse> {
    const params = new URLSearchParams({
      feed,
      limit: limit.toString(),
    });

    if (cursor) {
      params.append("cursor", cursor);
    }

    const response = await fetch(
      `${this.baseUrl}/app.bsky.feed.getFeed?${params}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessJwt}`,
        },
      }
    );

    if (!response.ok) {
      const error: BlueskyError = await response.json();
      throw new Error(error.message || "Failed to get feed");
    }

    return await response.json();
  }

  /**
   * Gets a specific post by its URI
   * @param accessJwt - Valid access JWT token
   * @param uri - The post's URI
   * @returns Promise resolving to post data
   */
  async getPost(accessJwt: string, uri: string): Promise<BlueskyPostView> {
    const response = await fetch(
      `${this.baseUrl}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(
        uri
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessJwt}`,
        },
      }
    );

    if (!response.ok) {
      const error: BlueskyError = await response.json();
      throw new Error(error.message || "Failed to get post");
    }

    const data = await response.json();
    return data.thread?.post;
  }

  /**
   * Gets a post thread including replies
   * @param accessJwt - Valid access JWT token
   * @param uri - The post's URI
   * @returns Promise resolving to thread data
   */
  async getPostThread(accessJwt: string, uri: string) {
    const response = await fetch(
      `${this.baseUrl}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(
        uri
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessJwt}`,
        },
      }
    );

    if (!response.ok) {
      const error: BlueskyError = await response.json();
      throw new Error(error.message || "Failed to get post thread");
    }

    return await response.json();
  }

  /**
   * Gets posts from a specific author
   * @param accessJwt - Valid access JWT token
   * @param actor - The author's handle or DID
   * @param limit - Number of posts to fetch (default: 20)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to author feed data
   */
  async getAuthorFeed(
    accessJwt: string,
    actor: string,
    limit: number = 20,
    cursor?: string
  ): Promise<BlueskyFeedResponse> {
    const params = new URLSearchParams({
      actor,
      limit: limit.toString(),
    });

    if (cursor) {
      params.append("cursor", cursor);
    }

    const response = await fetch(
      `${this.baseUrl}/app.bsky.feed.getAuthorFeed?${params}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessJwt}`,
        },
      }
    );

    if (!response.ok) {
      const error: BlueskyError = await response.json();
      throw new Error(error.message || "Failed to get author feed");
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
export type {
  BlueskyError,
  BlueskyFeed,
  BlueskyFeedItem,
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyPostView,
  BlueskySession,
};
