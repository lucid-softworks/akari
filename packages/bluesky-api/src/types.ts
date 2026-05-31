/**
 * Bluesky post view from feed responses
 */

// Common types used across multiple interfaces
export type BlueskyAssociated = {
  lists: number;
  feedgens: number;
  starterPacks: number;
  labeler: boolean;
  chat: {
    allowIncoming: string;
  };
};

export type BlueskyViewer = {
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
};

/**
 * A single verification record from a trusted verifier (per app.bsky.actor.defs#verificationView).
 */
export type BlueskyVerificationView = {
  /** DID of the issuing verifier */
  issuer: string;
  /** AT-URI of the verification record */
  uri: string;
  /** Whether the verification is currently valid */
  isValid: boolean;
  /** When the verification record was created */
  createdAt: string;
};

export type BlueskyVerificationStatus = 'valid' | 'invalid' | 'none';

/**
 * Bluesky verification state (app.bsky.actor.defs#verificationState).
 * Attached to profile views when the actor is verified or is a trusted verifier.
 */
export type BlueskyVerification = {
  verifications: BlueskyVerificationView[];
  verifiedStatus: BlueskyVerificationStatus;
  trustedVerifierStatus: BlueskyVerificationStatus;
};

export type BlueskyStatus = {
  status: string;
  record: Record<string, unknown>;
  embed?: BlueskyEmbed;
  expiresAt: string;
  isActive: boolean;
};

export type BlueskyLabel = {
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
};

export type BlueskyImage = {
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
};

export type BlueskyVideo = {
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
};

export type BlueskyExternal = {
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
  /**
   * AppView-enriched fields. Present only when the bsky AppView
   * recognises the link as a Standard.site publication (sites built on
   * `site.standard.*` lexicons — pckt.blog, augment.ink, standard.site).
   * The AppView resolves the URL → `site.standard.document` +
   * `site.standard.publication` records and folds the rendered metadata
   * back into the external view so clients paint a richer card without
   * doing the lookup themselves.
   *
   * Detect via `source?.$type === 'app.bsky.embed.external#viewExternalSource'`
   * before reaching for the Standard.site card; absence means render the
   * regular link card.
   */
  /** Document's `publishedAt` ISO timestamp. */
  createdAt?: string;
  /** Estimated reading time in minutes. AppView computes from `textContent`. */
  readingTime?: number;
  /** Publication metadata — name + icon CDN URL + canonical site URL +
   *  description. Mirrors `site.standard.publication`. */
  source?: {
    $type?: string;
    uri: string;
    icon?: string;
    title?: string;
    description?: string;
  };
  /** Author / contributor profiles. First entry is the byline author —
   *  AppView pulls from the document's `contributors` + publication owner.
   *  Shape is the standard bsky author view; can't reference BlueskyAuthor
   *  here without a forward-declared circular import, so the structural
   *  type below is kept narrow to what the card actually reads. */
  associatedProfiles?: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  }[];
  /** Strong refs to the underlying records (document + publication). */
  associatedRefs?: {
    $type?: string;
    uri: string;
    cid?: string;
  }[];
};

export type BlueskyRecordAuthor = {
  did: string;
  handle: string;
  displayName: string;
  avatar: string;
  viewer?: {
    blockedBy?: boolean;
    blocking?: string;
  };
  verification?: BlueskyVerification;
};

export type BlueskyRecordValue = {
  $type?: string;
  text?: string;
  createdAt?: string;
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
  langs?: string[];
};

export type BlueskyNestedRecord = {
  $type?: string;
  author?: BlueskyRecordAuthor;
  value?: BlueskyRecordValue;
  record?: BlueskyNestedRecord; // For deeply nested records (recordWithMedia)
  uri?: string;
  cid?: string;
  indexedAt?: string;
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
  quoteCount?: number;
  embeds?: BlueskyEmbed[];
  labels?: BlueskyLabel[];
};

export type BlueskyProfileUpdateInput = {
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
};

export type BlueskyFeedGeneratorsResponse = {
  feeds: BlueskyFeed[];
};

export type BlueskyPostReplyReference = {
  root: string;
  parent: string;
};

export type BlueskyPostImageInput = {
  uri: string;
  alt: string;
  mimeType: string;
  tenorId?: string;
};

export type BlueskyCreatePostInput = {
  text: string;
  replyTo?: BlueskyPostReplyReference;
  images?: BlueskyPostImageInput[];
  /** Optional video to attach. The lexicon disallows mixing
   *  images + video, so callers should send only one. The blob ref
   *  must already be transcoded — produced by the
   *  app.bsky.video.uploadVideo + getJobStatus pipeline. */
  video?: {
    blob: { $type: 'blob'; ref: { $link: string }; mimeType: string; size: number };
    alt?: string;
    aspectRatio?: { width: number; height: number };
  };
  /** Optional record to quote (post URI/CID). If `images` are also provided,
   * the post is encoded as `app.bsky.embed.recordWithMedia`. */
  quote?: { uri: string; cid: string };
  /** Optional `app.bsky.embed.external` link card. Used to attach a poll
   * (`uri` points at the `tech.tokimeki.poll.poll` record). Mutually
   * exclusive with images/video/quote — only set on a plain link/poll post. */
  externalEmbed?: {
    uri: string;
    title: string;
    description: string;
  };
  /** BCP-47 language tags the post is written in (e.g. ['en'], ['es', 'pt']).
   *  Drives the AppView's per-language feeds and moderation. Defaults to
   *  ['en'] on the server side when omitted. */
  langs?: string[];
  /** Optional richtext facets (links, mentions, tags). Indices are UTF-8
   *  byte offsets into `text`. Without these, links / mentions / hashtags
   *  in the body render as plain text instead of being clickable. */
  facets?: {
    index: { byteStart: number; byteEnd: number };
    features: { $type: string; uri?: string; tag?: string; did?: string }[];
  }[];
};

export type CreateReviewInput = {
  identifiers: {
    tmdbId?: string;
    imdbId?: string;
    igdbId?: string;
    isbn10?: string;
    isbn13?: string;
    asin?: string;
    other?: string;
    mbReleaseId?: string;
    parentMbReleaseId?: string;
    episodeNumber?: number;
    seasonNumber?: number;
    tmdbTvSeriesId?: string;
  };
  creativeWorkType: 'movie' | 'tv_show' | 'video_game' | 'album' | 'book' | 'book_series' | 'episode' | 'ep' | 'tv_season' | 'tv_episode' | 'track';
  rating: number;
  text?: string;
  title?: string;
  poster?: { $type: 'blob'; ref: { $link: string }; mimeType: string; size: number };
  tags?: string[];
  genres?: string[];
  mainCredit?: string;
  mainCreditRole?: 'director' | 'author' | 'artist' | 'showrunner' | 'lead_actor' | 'creator' | 'studio' | 'publisher' | 'developer' | 'performer' | 'network';
  isRevisit?: boolean;
  containsSpoilers?: boolean;
  releaseDate?: string;
  posterUrl?: string;
};

export type BlueskyUploadBlobResponse = {
  blob: {
    ref: {
      $link: string;
    };
    mimeType: string;
    size: number;
  };
};

export type BlueskyCreatePostResponse = {
  uri: string;
  cid: string;
  commit: {
    cid: string;
    rev: string;
  };
  validationStatus: string;
};

/**
 * Generic createRecord response shape (com.atproto.repo.createRecord).
 */
export type BlueskyCreateRecordResponse = {
  uri: string;
  cid: string;
  commit?: { cid: string; rev: string };
  validationStatus?: string;
};

/**
 * View of an `app.bsky.graph.list` record (curation, mute, or block list).
 */
export type BlueskyListView = {
  uri: string;
  cid: string;
  name: string;
  /** `app.bsky.graph.defs#curatelist` or `#modlist` */
  purpose: string;
  description?: string;
  avatar?: string;
  listItemCount?: number;
  creator: BlueskyRecordAuthor;
  indexedAt: string;
  viewer?: {
    muted?: boolean;
    blocked?: string;
  };
};

/**
 * Response from `app.bsky.graph.getLists` — actor's owned lists.
 */
export type BlueskyListsResponse = {
  cursor?: string;
  lists: BlueskyListView[];
};

/**
 * Response from `app.bsky.graph.getList` — list metadata + members.
 */
export type BlueskyListResponse = {
  cursor?: string;
  list: BlueskyListView;
  items: {
    uri: string;
    subject: BlueskyRecordAuthor;
  }[];
};

/**
 * Response from `app.bsky.graph.getMutes` — actor's muted accounts.
 * Forward-declared as a type alias so this file does not need to be
 * structurally aware of `BlueskyProfile` (which is declared below).
 */
export type BlueskyMutesResponse = {
  cursor?: string;
  mutes: BlueskyProfile[];
};

/**
 * Response from `app.bsky.graph.getBlocks` — actor's blocked accounts.
 */
export type BlueskyBlocksResponse = {
  cursor?: string;
  blocks: BlueskyProfile[];
};

/**
 * Response from `app.bsky.graph.getFollows` — the supplied actor's follows.
 * `subject` is the actor whose follow list is being viewed; `follows` are the
 * accounts they follow.
 */
export type BlueskyFollowsResponse = {
  cursor?: string;
  subject: BlueskyProfile;
  follows: BlueskyProfile[];
};

/**
 * A single `app.bsky.graph.follow` record as returned by `listRecords`.
 * The record's `subject` is the followed actor's DID; `createdAt` is when
 * the follow record was written, which is the only way to recover "when
 * did I follow this person" since getFollows doesn't carry that field.
 */
export type BlueskyFollowRecord = {
  uri: string;
  cid: string;
  value: {
    $type?: string;
    subject: string;
    createdAt: string;
  };
};

export type BlueskyFollowRecordsResponse = {
  cursor?: string;
  records: BlueskyFollowRecord[];
};

/**
 * Response from `app.bsky.graph.getListMutes` — lists the user has muted.
 */
export type BlueskyListMutesResponse = {
  cursor?: string;
  lists: BlueskyListView[];
};

/**
 * Response from `app.bsky.graph.getListBlocks` — lists the user has blocked.
 */
export type BlueskyListBlocksResponse = {
  cursor?: string;
  lists: BlueskyListView[];
};

export type BlueskySendMessageInput = {
  text: string;
  /**
   * Optional richtext facets (links, mentions, tags). atproto byte offsets,
   * not JS string indices.
   */
  facets?: {
    index: { byteStart: number; byteEnd: number };
    features: { $type: string; uri?: string; tag?: string; did?: string }[];
  }[];
  /**
   * Optional embedded record (a post share). The chat lexicon only
   * permits `app.bsky.embed.record` here; richer embed types are not
   * accepted and will be rejected by the appview.
   */
  embed?: {
    $type: 'app.bsky.embed.record';
    record: { uri: string; cid: string };
  };
};

export type BlueskyUnreadNotificationCount = {
  count: number;
};

export type BlueskyRecord = {
  uri: string;
  cid: string;
  $type?: string; // For blocked records like 'app.bsky.embed.record#viewBlocked'
  author: BlueskyRecordAuthor;
  record?: BlueskyNestedRecord;
  value?: BlueskyRecordValue; // For record embeds, contains the actual post data
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
  /** The record's facets for rich text rendering */
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
};

export type BlueskyEmbed = {
  $type: string;
  images?: BlueskyImage[];
  video?: BlueskyVideo;
  external?: BlueskyExternal;
  record?: BlueskyRecord;
  media?: BlueskyEmbed;
  // New video embed properties for app.bsky.embed.video#view
  playlist?: string;
  thumbnail?: string;
  alt?: string;
  aspectRatio?: {
    width: number;
    height: number;
  };
};

export type BlueskyAuthor = {
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
};

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
    /** Set by the AppView when the viewer is excluded by the post's
     * threadgate rules (mention/follow/list). Surface this in the UI so
     * the user knows their reply attempt would be rejected. */
    replyDisabled?: boolean;
    /** Whether quoting this post is currently allowed for the viewer. */
    embeddingDisabled?: boolean;
    /** Whether the requesting account has bookmarked this post via
     * `app.bsky.bookmark.createBookmark`. Boolean rather than a URI
     * because bookmarks are private AppView state, not a public record. */
    bookmarked?: boolean;
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
 * Response from like operations
 */
export type BlueskyLikeResponse = {
  /** The like record's URI */
  uri: string;
  /** The like record's CID */
  cid: string;
  /** Commit information */
  commit: {
    /** Commit CID */
    cid: string;
    /** Commit revision */
    rev: string;
  };
  /** Validation status */
  validationStatus: string;
};

/**
 * Response from unlike operations
 */
export type BlueskyUnlikeResponse = {
  /** Commit information */
  commit: {
    /** Commit CID */
    cid: string;
    /** Commit revision */
    rev: string;
  };
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
 * Bluesky send message response
 */
export type BlueskySendMessageResponse = {
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
 * Alias matching the lexicon name (`chat.bsky.convo.defs#convoView`).
 */
export type BlueskyConvoView = BlueskyConvo;

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
  /** Reply context if this is a reply. Per `app.bsky.feed.defs#replyRef`
   * the AppView populates `root` and `parent` with full post views (or
   * a notFoundPost / blockedPost stub when the upstream post has been
   * deleted / blocked the viewer); the feed UI uses these to render
   * the inline parent above the reply. */
  reply?: {
    root?: BlueskyPostView;
    parent?: BlueskyPostView;
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
 * Subject information for a bookmark
 */
export type BlueskyBookmarkSubject = {
  /** The URI of the bookmarked record */
  uri: string;
  /** The CID of the bookmarked record */
  cid: string;
};

/**
 * Bluesky bookmark entry containing the bookmarked post and metadata
 */
export type BlueskyBookmark = {
  /** When the bookmark was created */
  createdAt: string;
  /** The subject record information */
  subject: BlueskyBookmarkSubject;
  /** The bookmarked post */
  item: BlueskyPostView;
};

/**
 * Response from the getBookmarks endpoint
 */
export type BlueskyBookmarksResponse = {
  /** Cursor for pagination */
  cursor?: string;
  /** Array of bookmarks */
  bookmarks: BlueskyBookmark[];
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
 * Bluesky trending topic entry
 */
export type BlueskyTrendingTopic = {
  /** Display text for the trending topic */
  topic: string;
  /** Relative link to the curated feed for the topic */
  link: string;
};

/**
 * Response from the getTrendingTopics endpoint
 */
export type BlueskyTrendingTopicsResponse = {
  /**
   * Array of trending topics surfaced by Bluesky. Each entry links to a curated
   * feed that aggregates posts about the topic.
   */
  topics: BlueskyTrendingTopic[];
  /** Optional list of suggested curated feeds for broader discovery */
  suggested?: BlueskyTrendingTopic[];
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
 * Live status view returned on a profile (`app.bsky.actor.defs#statusView`).
 *
 * Present when an account has published an `app.bsky.actor.status` record.
 * `status` is currently always `app.bsky.actor.status#live`. `isActive` is
 * the AppView's "not expired" flag; `isDisabled` is set when a moderator has
 * revoked the account's go-live access. The embed (when present) is the
 * `app.bsky.embed.external#view` shape pointing at the live link.
 */
export type BlueskyActorStatusView = {
  /** Status token, e.g. `app.bsky.actor.status#live`. */
  status: string;
  /** The underlying `app.bsky.actor.status` record. */
  record: unknown;
  /** AT-URI of the status record. */
  uri?: string;
  /** CID of the status record. */
  cid?: string;
  /** External-link embed for the live content. */
  embed?: {
    $type?: string;
    external?: {
      uri: string;
      title?: string;
      description?: string;
      /** View shape resolves this to a URL string; record shape is a blob ref. */
      thumb?: unknown;
    };
  };
  /** ISO 8601 timestamp at which the status expires. */
  expiresAt?: string;
  /** True while the status is still within its duration window. */
  isActive?: boolean;
  /** True when a moderator has disabled the account's go-live access. */
  isDisabled?: boolean;
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
  /** Free-form pronouns text (max 20 graphemes per app.bsky.actor.profile). */
  pronouns?: string;
  /** The user's website URL (free-form URI per app.bsky.actor.profile). */
  website?: string;
  /** The user's avatar URL */
  avatar?: string;
  /** The user's banner URL */
  banner?: string;
  /** When the profile record was created (account creation date, ISO 8601). */
  createdAt?: string;
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
  /** Pinned post strong reference, if the user has pinned a post. */
  pinnedPost?: { uri: string; cid: string };
  /** Verification state (verified accounts and trusted verifiers). */
  verification?: BlueskyVerification;
  /** Live status, present when the account is broadcasting via `app.bsky.actor.status`. */
  status?: BlueskyActorStatusView;
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
 * Bluesky starterpack from the getActorStarterPacks endpoint
 */
export type BlueskyStarterPack = {
  /** The starterpack's URI */
  uri: string;
  /** The starterpack's CID */
  cid: string;
  /** The starterpack's record data */
  record: {
    $type: string;
    createdAt: string;
    description: string;
    feeds: string[];
    list: string;
    name: string;
    updatedAt: string;
  };
  /** The starterpack creator's information */
  creator: BlueskyAuthor;
  /** Number of users who joined this week */
  joinedWeekCount: number;
  /** Number of users who joined all time */
  joinedAllTimeCount: number;
  /** Labels applied to the starterpack */
  labels: BlueskyLabel[];
  /** When the starterpack was indexed */
  indexedAt: string;
};

/**
 * Response from the getActorStarterPacks endpoint
 */
export type BlueskyStarterPacksResponse = {
  /** Cursor for pagination */
  cursor?: string;
  /** Array of starterpacks */
  starterPacks: BlueskyStarterPack[];
};

/**
 * Tangled repo record stored in the sh.tangled.repo collection
 */
export type BlueskyTangledRepo = {
  /** AT URI of the repo record */
  uri: string;
  /** CID of the repo record */
  cid: string;
  /** Tangled repo record value */
  value: {
    /** Lexicon type identifier */
    $type: 'sh.tangled.repo';
    /** Name of the repo */
    name: string;
    /** Knot where the repo was created */
    knot: string;
    /** Optional spindle/CI runner */
    spindle?: string;
    /** Optional repo description */
    description?: string;
    /** Optional source URL */
    source?: string;
    /** Optional list of label URIs */
    labels?: string[];
    /** When the repo was created */
    createdAt: string;
  };
  /** When the record was indexed */
  indexedAt?: string;
};

/**
 * Response from the com.atproto.repo.listRecords endpoint for Tangled repos
 */
export type BlueskyTangledReposResponse = {
  /** Cursor for pagination */
  cursor?: string;
  /** Tangled repo records */
  records: BlueskyTangledRepo[];
};

/**
 * Blue.linkat.board card record
 */
export type BlueskyLinkatCard = {
  /** URL of the card */
  url: string;
  /** Text of the card */
  text: string;
  /** Emoji of the card */
  emoji: string;
};

/**
 * Blue.linkat.board record stored in the blue.linkat.board collection
 */
export type BlueskyLinkatBoard = {
  /** AT URI of the board record */
  uri: string;
  /** CID of the board record */
  cid: string;
  /** Blue.linkat.board record value */
  value: {
    /** Lexicon type identifier */
    $type: 'blue.linkat.board';
    /** List of cards in the board */
    cards: BlueskyLinkatCard[];
  };
  /** When the record was indexed */
  indexedAt?: string;
};

/**
 * Response from the com.atproto.repo.listRecords endpoint for Blue.linkat.board records
 */
export type BlueskyLinkatBoardResponse = {
  /** Cursor for pagination */
  cursor?: string;
  /** Blue.linkat.board records */
  records: BlueskyLinkatBoard[];
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

/**
 * Saved feed item from preferences
 */
export type BlueskySavedFeedItem = {
  /** Type of feed item */
  type: 'feed' | 'timeline';
  /** Feed URI or timeline identifier */
  value: string;
  /** Whether the feed is pinned */
  pinned: boolean;
  /** Unique identifier for the saved feed */
  id: string;
};

/**
 * Saved feeds preference
 */
export type BlueskySavedFeedsPref = {
  /** Type identifier */
  $type: 'app.bsky.actor.defs#savedFeedsPrefV2';
  /** Array of saved feed items */
  items: BlueskySavedFeedItem[];
};

/**
 * Personal details preference
 */
export type BlueskyPersonalDetailsPref = {
  /** Type identifier */
  $type: 'app.bsky.actor.defs#personalDetailsPref';
  /** Birth date */
  birthDate?: string;
};

/**
 * Interests preference
 */
export type BlueskyInterestsPref = {
  /** Type identifier */
  $type: 'app.bsky.actor.defs#interestsPref';
  /** Array of interest tags */
  tags: string[];
};

/**
 * Content languages the user wants their feeds filtered to. Empty
 * array (or missing pref) means "show every language".
 *
 * @see https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/actor/defs.json
 */
export type BlueskyContentLanguagesPref = {
  $type: 'app.bsky.actor.defs#contentLanguagesPref';
  /** BCP-47 language codes (e.g. 'en', 'ja', 'pt-BR'). */
  languages: string[];
};

/**
 * Default sort + ranking choices applied to thread views (the post
 * detail screen). atproto exposes a few preset sort orders plus a
 * boolean to bubble replies from accounts the viewer follows.
 */
export type BlueskyThreadViewPref = {
  $type: 'app.bsky.actor.defs#threadViewPref';
  sort?: 'oldest' | 'newest' | 'most-likes' | 'random' | 'hotness';
  prioritizeFollowedUsers?: boolean;
};

/**
 * Per-category filter that supports an `include` selector — applies to
 * categories where the user can scope to "everyone" vs. "only people I
 * follow" (follow / like / mention / quote / reply / repost variants).
 *
 * The `list` knob controls in-app inbox visibility; `push` controls
 * device push notifications. To silence a category entirely, set both
 * to false — there is no separate "off" enum.
 */
export type BlueskyNotificationFilter = {
  include: 'all' | 'follows';
  list: boolean;
  push: boolean;
};

/**
 * Categories without an audience selector (starterpackJoined,
 * subscribedPost, unverified, verified). Same list/push semantics as
 * `BlueskyNotificationFilter`, just no `include`.
 */
export type BlueskyNotificationListPushPref = {
  list: boolean;
  push: boolean;
};

/**
 * Chat preference uses a different `include` enum — either every message
 * generates a notification, or only those in already-accepted convos.
 * There is no separate `list` flag (chat notifications always show in
 * the inbox; only push is independently configurable).
 */
export type BlueskyChatNotificationFilter = {
  include: 'all' | 'accepted';
  push: boolean;
};

/**
 * Response from `app.bsky.notification.getPreferences` and the input shape
 * for `app.bsky.notification.putPreferencesV2`. atproto returns the full
 * preferences object; the v2 put accepts the same shape.
 */
export type BlueskyNotificationPreferences = {
  chat?: BlueskyChatNotificationFilter;
  follow?: BlueskyNotificationFilter;
  like?: BlueskyNotificationFilter;
  likeViaRepost?: BlueskyNotificationFilter;
  mention?: BlueskyNotificationFilter;
  quote?: BlueskyNotificationFilter;
  reply?: BlueskyNotificationFilter;
  repost?: BlueskyNotificationFilter;
  repostViaRepost?: BlueskyNotificationFilter;
  starterpackJoined?: BlueskyNotificationListPushPref;
  subscribedPost?: BlueskyNotificationListPushPref;
  unverified?: BlueskyNotificationListPushPref;
  verified?: BlueskyNotificationListPushPref;
};

/**
 * Default reply / quote restrictions used when the user creates a new
 * post. atproto's lexicon represents the threadgate allow set as an
 * array of tagged unions (`mentionRule`, `followerRule`, `followingRule`,
 * `listRule`), and quotes are gated independently via
 * `postgateEmbeddingRules`. The shape is intentionally permissive so
 * callers can keep their own narrower view of what each rule means
 * without needing to update this type for every new rule the network
 * adds.
 */
export type BlueskyPostInteractionSettingsPref = {
  $type: 'app.bsky.actor.defs#postInteractionSettingsPref';
  /** When omitted, the post defaults to "everyone can reply". An empty
   *  array explicitly means "nobody can reply". */
  threadgateAllowRules?: { $type: string; list?: string }[];
  /** Each rule disables a class of embedding (e.g. `disableRule` blocks
   *  quote posts). */
  postgateEmbeddingRules?: { $type: string }[];
};

/**
 * Adult content preference
 */
export type BlueskyAdultContentPref = {
  /** Type identifier */
  $type: 'app.bsky.actor.defs#adultContentPref';
  /** Whether adult content is enabled */
  enabled: boolean;
};

/**
 * Content label preference
 */
export type BlueskyContentLabelPref = {
  /** Type identifier */
  $type: 'app.bsky.actor.defs#contentLabelPref';
  /** Label name */
  label: string;
  /** Visibility setting */
  visibility: 'show' | 'warn' | 'hide' | 'ignore';
};

/**
 * App state preference
 */
export type BlueskyAppStatePref = {
  /** Type identifier */
  $type: 'app.bsky.actor.defs#bskyAppStatePref';
  /** NUX completion status */
  nuxs?: {
    id: string;
    completed: boolean;
  }[];
};

/**
 * Subscribed labelers preference
 */
export type BlueskyLabelersPref = {
  /** Type identifier */
  $type: 'app.bsky.actor.defs#labelersPref';
  /** List of labeler service DIDs the user subscribes to */
  labelers: { did: string }[];
};

/**
 * A single muted word/phrase entry inside `mutedWordsPref`.
 * @see https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/actor/defs.json
 */
export type BlueskyMutedWord = {
  /** Server-assigned identifier (omit when adding a new entry — server fills it). */
  id?: string;
  /** The word, phrase, or tag to mute. */
  value: string;
  /** Where to match: post `content` (text), `tag` (hashtags/facets), or both. */
  targets: ('content' | 'tag')[];
  /** Whose posts to apply the rule to. Default `'all'`. `'exclude-following'` skips accounts you follow. */
  actorTarget?: 'all' | 'exclude-following';
  /** Optional ISO 8601 datetime — once past, the rule is ignored client-side. */
  expiresAt?: string;
};

/**
 * Muted words preference
 */
export type BlueskyMutedWordsPref = {
  /** Type identifier */
  $type: 'app.bsky.actor.defs#mutedWordsPref';
  /** List of muted word entries */
  items: BlueskyMutedWord[];
};

/**
 * Per-feed view preferences (hide replies / reposts / quote posts on a
 * particular feed). `feed` is the at:// URI of the feed gen, or the
 * literal string `'home'` for the user's Following timeline.
 */
export type BlueskyFeedViewPref = {
  $type: 'app.bsky.actor.defs#feedViewPref';
  feed: string;
  hideReplies?: boolean;
  hideRepliesByUnfollowed?: boolean;
  hideRepliesByLikeCount?: number;
  hideReposts?: boolean;
  hideQuotePosts?: boolean;
};

/**
 * Union type for all preference types
 */
export type BlueskyPreference =
  | BlueskySavedFeedsPref
  | BlueskyPersonalDetailsPref
  | BlueskyInterestsPref
  | BlueskyAdultContentPref
  | BlueskyPostInteractionSettingsPref
  | BlueskyContentLabelPref
  | BlueskyContentLanguagesPref
  | BlueskyThreadViewPref
  | BlueskyAppStatePref
  | BlueskyLabelersPref
  | BlueskyMutedWordsPref
  | BlueskyFeedViewPref;

/**
 * Labeler service view
 */
export type BlueskyLabelerView = {
  $type?: string;
  uri: string;
  cid: string;
  creator: BlueskyRecordAuthor;
  likeCount?: number;
  viewer?: { like?: string };
  indexedAt: string;
  /** Detailed view only — defines what the service moderates. */
  policies?: {
    labelValues: string[];
    labelValueDefinitions?: {
      identifier: string;
      severity: string;
      blurs: string;
      defaultSetting?: string;
      adultOnly?: boolean;
      locales: { lang: string; name: string; description: string }[];
    }[];
  };
  /** Detailed view only — report reason types this labeler accepts (e.g.
   * `com.atproto.moderation.defs#reasonSpam`). When omitted, treat as accepting all. */
  reasonTypes?: string[];
  /** Detailed view only — subject types accepted (`account` / `record`). */
  subjectTypes?: ('account' | 'record')[];
};

export type BlueskyLabelerServicesResponse = {
  views: BlueskyLabelerView[];
};

/**
 * Response from the getPreferences endpoint
 */
export type BlueskyPreferencesResponse = {
  /** Array of user preferences */
  preferences: BlueskyPreference[];
};

/**
 * Recipe image from exchange.recipe.recipe#image
 */
export type BlueskyRecipeImage = {
  image: {
    $type: 'blob';
    ref: {
      $link: string;
    };
    mimeType: string;
    size: number;
  };
  alt: string;
  aspectRatio?: {
    width: number;
    height: number;
  };
};

/**
 * Recipe image embed from exchange.recipe.recipe#imagesEmbed
 */
export type BlueskyRecipeImageEmbed = {
  $type: 'exchange.recipe.recipe#imagesEmbed';
  images: BlueskyRecipeImage[];
};

/**
 * Recipe view image from exchange.recipe.recipe#viewImage
 */
export type BlueskyRecipeViewImage = {
  thumb: string;
  fullsize: string;
  alt: string;
  aspectRatio?: {
    width: number;
    height: number;
  };
};

/**
 * Recipe view from exchange.recipe.recipe#view
 */
export type BlueskyRecipeView = {
  $type: 'exchange.recipe.recipe#view';
  images: BlueskyRecipeViewImage[];
};

/**
 * Recipe nutrition information
 */
export type BlueskyRecipeNutrition = {
  calories?: number;
  fatContent?: number;
  proteinContent?: number;
  carbohydrateContent?: number;
};

/**
 * Recipe attribution union types
 */
export type BlueskyRecipeOriginalAttribution = {
  $type: 'exchange.recipe.defs#originalAttribution';
  type: 'original';
  license: string; // exchange.recipe.defs#license
  url?: string;
};

export type BlueskyRecipePersonAttribution = {
  $type: 'exchange.recipe.defs#personAttribution';
  type: 'person';
  name: string;
  url?: string;
  notes?: string;
};

export type BlueskyRecipePublicationAttribution = {
  $type: 'exchange.recipe.defs#publicationAttribution';
  type: 'publication';
  publicationType: string; // exchange.recipe.defs#publicationType
  title: string;
  author: string;
  publisher?: string;
  isbn?: string;
  page?: number;
  url?: string;
  notes?: string;
};

export type BlueskyRecipeWebsiteAttribution = {
  $type: 'exchange.recipe.defs#websiteAttribution';
  type: 'website';
  name: string;
  url: string;
  notes?: string;
};

export type BlueskyRecipeShowAttribution = {
  $type: 'exchange.recipe.defs#showAttribution';
  type: 'show';
  title: string;
  episode?: string;
  network: string;
  airDate?: string;
  url?: string;
  notes?: string;
};

export type BlueskyRecipeProductAttribution = {
  $type: 'exchange.recipe.defs#productAttribution';
  type: 'product';
  brand: string;
  name: string;
  upc?: string;
  url?: string;
  notes?: string;
};

export type BlueskyRecipeAttribution =
  | BlueskyRecipeOriginalAttribution
  | BlueskyRecipePersonAttribution
  | BlueskyRecipePublicationAttribution
  | BlueskyRecipeWebsiteAttribution
  | BlueskyRecipeShowAttribution
  | BlueskyRecipeProductAttribution;

/**
 * Recipe record stored in the exchange.recipe.recipe collection
 */
export type BlueskyRecipeRecord = {
  /** AT URI of the recipe record */
  uri: string;
  /** CID of the recipe record */
  cid: string;
  /** Recipe record value */
  value: {
    /** Lexicon type identifier */
    $type: 'exchange.recipe.recipe';
    /** Recipe name */
    name: string;
    /** Recipe description */
    text: string;
    /** Recipe attribution */
    attribution?: BlueskyRecipeAttribution;
    /** List of ingredients */
    ingredients: string[];
    /** List of cooking instructions */
    instructions: string[];
    /** Recipe embed (images) */
    embed?: BlueskyRecipeImageEmbed;
    /** Time required for preparation */
    prepTime?: string;
    /** Time required for cooking */
    cookTime?: string;
    /** Total time required */
    totalTime?: string;
    /** Number of servings or yield */
    recipeYield?: string;
    /** Category of recipe (e.g., appetizer, main course) */
    recipeCategory?: string;
    /** Cuisine type (e.g., Italian, Mexican) */
    recipeCuisine?: string;
    /** Method of cooking (e.g., baking, grilling) */
    cookingMethod?: string;
    /** Nutritional information */
    nutrition?: BlueskyRecipeNutrition;
    /** Dietary restrictions this recipe is suitable for */
    suitableForDiet?: string[];
    /** Tags describing the recipe */
    keywords?: string[];
    /** Timestamp when this recipe was created */
    createdAt: string;
    /** Timestamp when this recipe was last updated */
    updatedAt: string;
  };
  /** When the record was indexed */
  indexedAt?: string;
};

/**
 * Response from the com.atproto.repo.listRecords endpoint for recipe records
 */
export type BlueskyRecipeRecordsResponse = {
  /** Array of recipe records */
  records: BlueskyRecipeRecord[];
  /** Pagination cursor for next page */
  cursor?: string;
};

/**
 * Local file reference for a draft embed. Embeds are device-bound — the
 * `path` is interpreted on the device that holds the file (a `file://` URI
 * on native, or whatever scheme the host chose).
 */
export type BlueskyDraftEmbedLocalRef = {
  path: string;
};

export type BlueskyDraftEmbedCaption = {
  lang: string;
  content: string;
};

export type BlueskyDraftEmbedImage = {
  localRef: BlueskyDraftEmbedLocalRef;
  alt?: string;
};

export type BlueskyDraftEmbedVideo = {
  localRef: BlueskyDraftEmbedLocalRef;
  alt?: string;
  captions?: BlueskyDraftEmbedCaption[];
};

export type BlueskyDraftEmbedExternal = {
  uri: string;
};

export type BlueskyDraftEmbedRecord = {
  record: { uri: string; cid: string };
};

export type BlueskyDraftPost = {
  text: string;
  labels?: { $type: 'com.atproto.label.defs#selfLabels'; values: { val: string }[] };
  embedImages?: BlueskyDraftEmbedImage[];
  embedVideos?: BlueskyDraftEmbedVideo[];
  embedExternals?: BlueskyDraftEmbedExternal[];
  embedRecords?: BlueskyDraftEmbedRecord[];
};

/**
 * Threadgate `allow` rule unions, as accepted by the lexicon. We model
 * these as discriminated `$type` values so we can read/write them
 * directly without an intermediate shape.
 */
export type BlueskyDraftThreadgateRule =
  | { $type: 'app.bsky.feed.threadgate#mentionRule' }
  | { $type: 'app.bsky.feed.threadgate#followingRule' }
  | { $type: 'app.bsky.feed.threadgate#followerRule' }
  | { $type: 'app.bsky.feed.threadgate#listRule'; list: string };

export type BlueskyDraftPostgateRule = {
  $type: 'app.bsky.feed.postgate#disableRule';
};

export type BlueskyDraft = {
  posts: BlueskyDraftPost[];
  langs?: string[];
  postgateEmbeddingRules?: BlueskyDraftPostgateRule[];
  threadgateAllow?: BlueskyDraftThreadgateRule[];
  deviceId?: string;
  deviceName?: string;
};

export type BlueskyDraftView = {
  id: string;
  draft: BlueskyDraft;
  createdAt: string;
  updatedAt: string;
};

export type BlueskyGetDraftsResponse = {
  drafts: BlueskyDraftView[];
  cursor?: string;
};

export type BlueskyCreateDraftResponse = {
  id: string;
};
