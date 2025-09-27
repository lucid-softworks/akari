/**
 * ClearSky API types
 */

/**
 * ISO timestamp string type
 */
export type ClearSkyTimestamp = string;

/**
 * DID (Decentralized Identifier) type
 */
export type ClearSkyDid = string;

/**
 * Handle type (e.g., "example.bsky.social")
 */
export type ClearSkyHandle = string;

/**
 * URL type
 */
export type ClearSkyUrl = string;

/**
 * Base response structure for most ClearSky API endpoints
 */
export type ClearSkyBaseResponse<T> = {
  data: T;
  'as of'?: ClearSkyTimestamp;
  identity?: string;
  status?: boolean;
};

/**
 * Response for get-did endpoint
 */
export type ClearSkyDidResponse = {
  data: {
    identifier: ClearSkyHandle;
    did_identifier: ClearSkyDid;
  };
};

/**
 * Response for get-handle endpoint
 */
export type ClearSkyHandleResponse = {
  data: {
    identifier: ClearSkyDid;
    handle_identifier: ClearSkyHandle;
  };
};

/**
 * User count information
 */
export type ClearSkyUserCount = {
  value: number;
  displayName: string;
};

/**
 * Response for total-users endpoint
 */
export type ClearSkyTotalUsersResponse = {
  data: {
    active_count: ClearSkyUserCount;
    total_count: ClearSkyUserCount;
    deleted_count: ClearSkyUserCount;
  };
  'as of': ClearSkyTimestamp;
};

/**
 * Response for validate-handle endpoint
 */
export type ClearSkyValidateHandleResponse = {
  data: {
    valid: boolean;
  };
  identity: string;
};

/**
 * Response for uri-url endpoint
 */
export type ClearSkyUriUrlResponse = {
  data: {
    url: ClearSkyUrl;
  };
};

/**
 * Block statistics item
 */
export type ClearSkyBlockStatsItem = {
  did: ClearSkyDid;
  count: number;
};

/**
 * Response for top block statistics
 */
export type ClearSkyTopBlockStatsResponse = {
  data: {
    blocked: ClearSkyBlockStatsItem[];
    blockers: ClearSkyBlockStatsItem[];
  };
  'as of': ClearSkyTimestamp;
};

/**
 * Response for 24-hour block statistics
 */
export type ClearSky24HourBlockStatsResponse = {
  data: {
    blocked: ClearSkyBlockStatsItem[];
    blockers: ClearSkyBlockStatsItem[];
  };
  'as of': ClearSkyTimestamp;
};

/**
 * Response for block-stats endpoint
 */
export type ClearSkyBlockStatsResponse = {
  data: {
    numberOfTotalBlocks: number;
    numberOfUniqueUsersBlocked: number;
    numberOfUniqueUsersBlocking: number;
    totalUsers: number;
    percentUsersBlocked: number;
    percentUsersBlocking: number;
    numberBlock1: number;
    numberBlocking2and100: number;
    numberBlocking101and1000: number;
    numberBlockingGreaterThan1000: number;
    percentNumberBlocking1: number;
    percentNumberBlocking2and100: number;
    percentNumberBlocking101and1000: number;
    percentNumberBlockingGreaterThan1000: number;
    averageNumberOfBlocks: number;
    numberBlocked1: number;
    numberBlocked2and100: number;
    numberBlocked101and1000: number;
    numberBlockedGreaterThan1000: number;
    percentNumberBlocked1: number;
    percentNumberBlocked2and100: number;
    percentNumberBlocked101and1000: number;
    percentNumberBlockedGreaterThan1000: number;
    averageNumberOfBlocked: number;
  };
  'as of': ClearSkyTimestamp;
};

/**
 * Moderation list item
 */
export type ClearSkyModerationListItem = {
  url: ClearSkyUrl;
  did: ClearSkyDid;
  name: string;
  description: string;
  created_date: ClearSkyTimestamp;
  date_added: ClearSkyTimestamp;
};

/**
 * Response for get-list endpoint
 */
export type ClearSkyGetListResponse = {
  data: {
    identifier: string;
    lists: ClearSkyModerationListItem[];
  };
};

/**
 * Response for get-list/total endpoint
 */
export type ClearSkyGetListTotalResponse = {
  identity: string;
  status: boolean;
  data: {
    count: number;
  };
};

/**
 * Blocklist item
 */
export type ClearSkyBlocklistItem = {
  did: ClearSkyDid;
  blocked_date: ClearSkyTimestamp;
};

/**
 * Response for blocklist endpoint
 */
export type ClearSkyBlocklistResponse = {
  identity: string;
  status: boolean;
  data: {
    blocklist: ClearSkyBlocklistItem[];
  };
};

/**
 * Response for single-blocklist endpoint
 */
export type ClearSkySingleBlocklistResponse = {
  identity: string;
  status: boolean;
  data: {
    blocklist: ClearSkyBlocklistItem[];
  };
};

/**
 * Response for blocklist/total endpoint
 */
export type ClearSkyBlocklistTotalResponse = {
  identity: string;
  status: boolean;
  data: {
    count: number;
  };
};

/**
 * Response for single-blocklist/total endpoint
 */
export type ClearSkySingleBlocklistTotalResponse = {
  identity: string;
  status: boolean;
  data: {
    count: number;
  };
};

/**
 * User profile information
 */
export type ClearSkyProfile = {
  identifier: string;
  handle: ClearSkyHandle;
  did_identifier: ClearSkyDid;
  user_url: ClearSkyUrl;
  pds: string;
  created_date: ClearSkyTimestamp;
  placement: number;
};

/**
 * Response for get-profile endpoint
 */
export type ClearSkyGetProfileResponse = {
  data: ClearSkyProfile;
};

/**
 * Subscribe blocks blocklist item
 */
export type ClearSkySubscribeBlocksBlocklistItem = {
  list_uri: string;
  date_added: ClearSkyTimestamp;
  list_owner: string;
  list_url: ClearSkyUrl;
  list_name: string;
};

/**
 * Response for subscribe-blocks-blocklist endpoint
 */
export type ClearSkySubscribeBlocksBlocklistResponse = {
  identity: string;
  status: boolean;
  data: {
    blocklists: ClearSkySubscribeBlocksBlocklistItem[];
  };
};

/**
 * Response for subscribe-blocks-single-blocklist endpoint
 */
export type ClearSkySubscribeBlocksSingleBlocklistResponse = {
  identity: string;
  status: boolean;
  data: {
    blocklists: ClearSkySubscribeBlocksBlocklistItem[];
  };
};

/**
 * User blocklist item
 */
export type ClearSkyUserBlocklistItem = {
  did: ClearSkyDid;
  date_added: ClearSkyTimestamp;
};

/**
 * Response for subscribe-blocks-single-blocklist/users endpoint
 */
export type ClearSkySubscribeBlocksSingleBlocklistUsersResponse = {
  identity: string;
  data: {
    blocklist: {
      users: ClearSkyUserBlocklistItem[];
    };
  };
};

/**
 * PDS count item
 */
export type ClearSkyPdsCountItem = {
  pds: string;
  did_count: number;
};

/**
 * Response for lists/dids-per-pds endpoint
 */
export type ClearSkyDidsPerPdsResponse = {
  data: ClearSkyPdsCountItem[];
};

/**
 * Moderation list search result
 */
export type ClearSkyModerationListSearchResult = {
  url: ClearSkyUrl;
  did: ClearSkyDid;
  name: string;
  description: string;
  created_date: ClearSkyTimestamp;
};

/**
 * Response for search/moderation-lists endpoint
 */
export type ClearSkySearchModerationListsResponse = {
  input: string;
  data: {
    lists: ClearSkyModerationListSearchResult[];
    pages: number;
  };
};

/**
 * Handle history entry
 */
export type ClearSkyHandleHistoryEntry = [string, string, string];

/**
 * Response for get-handle-history endpoint
 */
export type ClearSkyGetHandleHistoryResponse = {
  data: {
    identifier: string;
    handle_history: ClearSkyHandleHistoryEntry[];
  };
};

/**
 * Response for status/time-behind endpoint
 */
export type ClearSkyTimeBehindResponse = {
  data: {
    'time behind': string;
  };
};

/**
 * Labeler information
 */
export type ClearSkyLabeler = {
  did: ClearSkyDid;
  endpoint: string;
  name: string;
  description: string;
  created_date: ClearSkyTimestamp;
};

/**
 * Response for get-labelers endpoint
 */
export type ClearSkyGetLabelersResponse = {
  data: ClearSkyLabeler[];
};

/**
 * Response for placement endpoint
 */
export type ClearSkyPlacementResponse = {
  identity: string;
  status: boolean;
  data: {
    placement: number;
  };
};

/**
 * Starter pack information
 */
export type ClearSkyStarterPack = {
  name: string;
  description: string;
  did: ClearSkyDid;
  created_date: ClearSkyTimestamp;
  url: ClearSkyUrl;
};

/**
 * Response for starter-packs endpoint
 */
export type ClearSkyStarterPacksResponse = {
  identity: string;
  status: boolean;
  data: {
    starter_packs: ClearSkyStarterPack[];
  };
};

/**
 * Response for starter-packs/total endpoint
 */
export type ClearSkyStarterPacksTotalResponse = {
  identity: string;
  status: boolean;
  data: {
    count: number;
  };
};

/**
 * Response for single-starter-pack endpoint
 */
export type ClearSkySingleStarterPackResponse = {
  identity: string;
  status: boolean;
  data: {
    starter_packs: ClearSkyStarterPack[];
  };
};

/**
 * Response for single-starter-pack/total endpoint
 */
export type ClearSkySingleStarterPackTotalResponse = {
  identity: string;
  status: boolean;
  data: {
    count: number;
  };
};

/**
 * ClearSky API error response
 */
export type ClearSkyError = {
  error: string;
  message: string;
  status?: number;
};

/**
 * Request options for API calls
 */
export type ClearSkyRequestOptions = {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: Record<string, unknown> | FormData | Blob;
  queryParameters?: Record<string, string>;
};

/**
 * Pagination options
 */
export type ClearSkyPaginationOptions = {
  page?: number;
};
