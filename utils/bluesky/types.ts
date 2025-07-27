/**
 * Bluesky post view from feed responses
 */
export type BlueskyPostView = {
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
export type BlueskyFeedItem = {
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
export type BlueskyFeedResponse = {
  /** Cursor for pagination */
  cursor?: string;
  /** Array of feed items (posts) */
  feed: BlueskyFeedItem[];
};

/**
 * Bluesky feed generator response from the getFeeds endpoint
 */
export type BlueskyFeed = {
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
export type BlueskyFeedsResponse = {
  /** Cursor for pagination */
  cursor?: string;
  /** Array of feeds */
  feeds: BlueskyFeed[];
};

/**
 * Bluesky session response from the createSession/refreshSession endpoints
 */
export type BlueskySession =
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
export type BlueskyError = {
  /** Error type/code */
  error: string;
  /** Human-readable error message */
  message: string;
};
