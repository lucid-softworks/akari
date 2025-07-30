/**
 * Bluesky post view from feed responses
 */

// Common types used across multiple interfaces
export interface BlueskyAssociated {
  lists: number;
  feedgens: number;
  starterPacks: number;
  labeler: boolean;
  chat: {
    allowIncoming: string;
  };
}

export interface BlueskyViewer {
  muted: boolean;
  mutedByList?: string;
  blockedBy: boolean;
  blocking?: string;
  blockingByList?: string;
  following?: string;
  followedBy?: string;
  knownFollowers?: {
    count: number;
    followers: string[];
  };
}

export interface BlueskyVerification {
  verifications: string[];
  verifiedStatus: string;
  trustedVerifierStatus: string;
}

export interface BlueskyStatus {
  status: string;
  record: Record<string, unknown>;
  embed?: BlueskyEmbed;
  expiresAt: string;
  isActive: boolean;
}

export interface BlueskyLabel {
  val: string;
  src: string;
  cts: string;
  uri: string;
  cid?: string;
  neg?: boolean;
  value?: string;
  text?: string;
  label?: string;
  ver?: number;
  exp?: string;
}

export interface BlueskyImage {
  alt: string;
  image?: {
    ref: {
      $link: string;
    };
    mimeType: string;
    size: number;
  };
  thumb: string;
  fullsize: string;
  aspectRatio?: {
    width: number;
    height: number;
  };
}

export interface BlueskyVideo {
  alt: string;
  ref: {
    $link: string;
  };
  mimeType: string;
  size: number;
  aspectRatio?: {
    width: number;
    height: number;
  };
}

export interface BlueskyExternal {
  uri: string;
  title: string;
  description: string;
  thumb?: {
    ref: {
      $link: string;
    };
    mimeType: string;
    size: number;
  };
}

export interface BlueskyRecord {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName: string;
    avatar: string;
  };
  record: Record<string, unknown>;
  value?: Record<string, unknown>; // For record embeds, contains the actual post data
  embed?: BlueskyEmbed;
  embeds?: BlueskyEmbed[]; // Array of embeds in the record
  replyCount: number;
  repostCount: number;
  likeCount: number;
  indexedAt: string;
  viewer?: {
    like?: string;
    repost?: string;
    reply?: string;
  };
}

export interface BlueskyEmbed {
  $type: string;
  images?: BlueskyImage[];
  video?: BlueskyVideo;
  external?: BlueskyExternal;
  record?: BlueskyRecord;
  media?: BlueskyEmbed;
  aspectRatio?: {
    width: number;
    height: number;
  };
}

export interface BlueskyAuthor {
  did: string;
  handle: string;
  displayName: string;
  avatar: string;
  associated: BlueskyAssociated;
  viewer: BlueskyViewer;
  labels: BlueskyLabel[];
  createdAt: string;
  verification?: BlueskyVerification;
  status?: BlueskyStatus;
}

export type BlueskyPostView = {
  /** The post's URI */
  uri: string;
  /** The post's CID */
  cid: string;
  /** The post author's information */
  author: BlueskyAuthor;
  /** The post's record data */
  record: Record<string, unknown>;
  /** The post's embed data */
  embed?: BlueskyEmbed;
  /** The post's reply data */
  reply?: {
    root: BlueskyPostView;
    parent: BlueskyPostView;
    grandparentAuthor?: BlueskyAuthor;
  };
  /** The post's repost/reason data */
  reason?: {
    by: BlueskyAuthor;
    indexedAt: string;
  };
  /** When the post was indexed */
  indexedAt: string;
  /** The post's labels */
  labels: BlueskyLabel[];
  /** Viewer's interaction with the post */
  viewer?: {
    like?: string;
    repost?: string;
    reply?: string;
  };
  /** The post's thread data */
  thread?: {
    replies?: BlueskyPostView[];
  };
  /** The post's embeds */
  embeds?: BlueskyEmbed[];
  /** The post's language tags */
  langs?: string[];
  /** The post's facets */
  facets?: {
    index: {
      byteStart: number;
      byteEnd: number;
    };
    features: {
      $type: string;
      uri?: string;
      tag?: string;
    }[];
  }[];
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
 * Bluesky conversation member
 */
export type BlueskyConvoMember = {
  did: string;
  handle: string;
  displayName: string;
  avatar: string;
  associated: BlueskyAssociated;
  viewer: BlueskyViewer;
  labels: BlueskyLabel[];
  chatDisabled: boolean;
  verification?: BlueskyVerification;
};

/**
 * Bluesky conversation message
 */
export type BlueskyConvoMessage = {
  id: string;
  rev: string;
  text: string;
  facets?: {
    index: {
      byteStart: number;
      byteEnd: number;
    };
    features: {
      $type: string;
      uri?: string;
      tag?: string;
    }[];
  }[];
  embed?: BlueskyEmbed;
  reactions?: {
    value: string;
    sender: {
      did: string;
    };
    createdAt: string;
  }[];
  sender: {
    did: string;
  };
  sentAt: string;
};

/**
 * Bluesky messages response
 */
export type BlueskyMessagesResponse = {
  cursor?: string;
  messages: BlueskyConvoMessage[];
};

/**
 * Bluesky conversation
 */
export type BlueskyConvo = {
  id: string;
  rev: string;
  members: BlueskyConvoMember[];
  lastMessage?: BlueskyConvoMessage;
  lastReaction?: {
    message: BlueskyConvoMessage;
    reaction: {
      value: string;
      sender: {
        did: string;
      };
      createdAt: string;
    };
  };
  muted: boolean;
  status: 'request' | 'accepted';
  unreadCount: number;
};

/**
 * Bluesky conversations response
 */
export type BlueskyConvosResponse = {
  cursor?: string;
  convos: BlueskyConvo[];
};

/**
 * Bluesky feed item (post with context)
 */
export type BlueskyFeedItem = {
  /** The post data */
  post: BlueskyPostView;
  /** Reply context if this is a reply */
  reply?: {
    grandparentAuthor?: BlueskyAuthor;
  };
  /** Repost/reason context if this is a repost */
  reason?: {
    by: BlueskyAuthor;
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
  creator: BlueskyAuthor;
  /** The feed's display name */
  displayName: string;
  /** The feed's description */
  description: string;
  /** Description facets for rich text */
  descriptionFacets?: {
    index: {
      byteStart: number;
      byteEnd: number;
    };
    features: {
      $type: string;
      uri?: string;
      tag?: string;
    }[];
  }[];
  /** The feed's avatar URI */
  avatar?: string;
  /** Number of likes on the feed */
  likeCount: number;
  /** Whether the feed accepts interactions */
  acceptsInteractions: boolean;
  /** Labels applied to the feed */
  labels: BlueskyLabel[];
  /** Viewer's interaction with the feed */
  viewer?: {
    like?: string;
  };
  /** Content mode for the feed */
  contentMode: 'app.bsky.feed.defs#contentModeUnspecified' | 'app.bsky.feed.defs#contentModeVideo';
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
      didDoc?: Record<string, unknown>;
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
      didDoc?: Record<string, unknown>;
      /** Whether the account is active */
      active: false;
      /**
       * Status indicating why the account is not active
       * Possible values: 'takendown', 'suspended', 'deactivated'
       */
      status: 'takendown' | 'suspended' | 'deactivated';
      /** JWT access token for API authentication */
      accessJwt: string;
      /** JWT refresh token for renewing the session */
      refreshJwt: string;
    };

/**
 * Bluesky profile information
 */
export type BlueskyProfile = {
  /** The user's DID */
  did: string;
  /** The user's handle */
  handle: string;
  /** The user's display name */
  displayName?: string;
  /** The user's description/bio */
  description?: string;
  /** The user's avatar URL */
  avatar?: string;
  /** The user's banner URL */
  banner?: string;
  /** When the profile was indexed */
  indexedAt: string;
  /** Number of followers */
  followersCount?: number;
  /** Number of users being followed */
  followsCount?: number;
  /** Number of posts */
  postsCount?: number;
  /** Viewer's interaction with the profile */
  viewer?: {
    muted?: boolean;
    blockedBy?: boolean;
    blocking?: string;
    following?: string;
    followedBy?: string;
  };
  /** Labels applied to the profile */
  labels?: BlueskyLabel[];
};

/**
 * Bluesky profile response from the getProfile endpoint
 */
export type BlueskyProfileResponse = BlueskyProfile;

/**
 * Response from the searchActors endpoint
 */
export type BlueskySearchActorsResponse = {
  /** Cursor for pagination */
  cursor?: string;
  /** Array of profiles */
  actors: BlueskyProfile[];
};

/**
 * Response from the searchPosts endpoint
 */
export type BlueskySearchPostsResponse = {
  /** Cursor for pagination */
  cursor?: string;
  /** Array of posts */
  posts: BlueskyPostView[];
};

/**
 * Bluesky thread item
 */
export type BlueskyThreadItem =
  | BlueskyFeedItem
  | {
      uri: string;
      notFound?: boolean;
      blocked?: boolean;
      author?: BlueskyAuthor;
    };

/**
 * Response from the getPostThread endpoint
 */
export type BlueskyThreadResponse = {
  /** The thread data */
  thread?: {
    /** Replies to the post */
    replies?: BlueskyThreadItem[];
    /** Thread context */
    threadContext?: {
      rootAuthorLike?: string;
    };
  };
  /** Thread access controls */
  threadgate?: {
    uri: string;
    cid: string;
    record: Record<string, unknown>;
    lists?: {
      uri: string;
      cid: string;
      name: string;
      purpose: string;
    }[];
  };
};

/**
 * Bluesky notification item
 */
export type BlueskyNotification = {
  /** The notification's URI */
  uri: string;
  /** The notification's CID */
  cid: string;
  /** The notification author's information */
  author: BlueskyAuthor;
  /** The reason for the notification */
  reason: string;
  /** The subject of the notification reason */
  reasonSubject?: string;
  /** The notification record data */
  record: Record<string, unknown>;
  /** Whether the notification has been read */
  isRead: boolean;
  /** When the notification was indexed */
  indexedAt: string;
  /** Labels applied to the notification */
  labels: BlueskyLabel[];
};

/**
 * Bluesky notifications response
 */
export type BlueskyNotificationsResponse = {
  /** Cursor for pagination */
  cursor?: string;
  /** Array of notifications */
  notifications: BlueskyNotification[];
  /** Whether there are priority notifications */
  priority: boolean;
  /** When notifications were last seen */
  seenAt: string;
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
