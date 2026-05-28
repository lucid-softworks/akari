/**
 * Centralized React Query keys for the akari app.
 *
 * Conventions:
 * - Each domain (notifications, messages, posts, ...) is a namespace.
 * - `*.all` is a broad invalidation handle that prefix-matches every
 *   sub-key in the domain (e.g. `notifications.all` invalidates both
 *   the list and the unread count).
 * - Functions take only the parameters that affect cache identity, in
 *   the same order they previously appeared in the inline arrays.
 * - Keys are returned `as const` so consumers get tuple types.
 *
 * Most identifier params accept `string | null | undefined` because callers
 * pass values gated on `enabled` rather than narrowing the type first; the
 * key just becomes `[…, undefined]` until the value is available, matching
 * the legacy inline-array behavior.
 */
type Maybe<T> = T | null | undefined;

export const queryKeys = {
  // ---- Auth / accounts ----
  auth: {
    all: ['auth'] as const,
    forDid: (did: Maybe<string>) => ['auth', did] as const,
  },
  appPasswords: {
    all: ['appPasswords'] as const,
    forDid: (did: Maybe<string>) => ['appPasswords', did] as const,
  },
  session: {
    all: ['session'] as const,
    forDid: (did: Maybe<string>) => ['session', did] as const,
  },
  jwtToken: () => ['jwtToken'] as const,
  refreshToken: () => ['refreshToken'] as const,
  currentAccount: () => ['currentAccount'] as const,
  accounts: () => ['accounts'] as const,
  accountProfiles: (dids: (string | undefined)[] | undefined, appViewEnabled?: boolean) =>
    ['accountProfiles', dids, appViewEnabled] as const,

  // ---- Notifications ----
  notifications: {
    all: ['notifications'] as const,
    list: (params: {
      limit: number;
      reasons: string[] | undefined;
      priority: boolean | undefined;
      did: string | undefined;
      appViewEnabled?: boolean;
    }) =>
      ['notifications', 'list', params.limit, params.reasons, params.priority, params.did, params.appViewEnabled] as const,
    unread: (did: string | undefined, appViewEnabled?: boolean) =>
      ['notifications', 'unread', did, appViewEnabled] as const,
    preferences: (did: string | undefined, appViewEnabled?: boolean) =>
      ['notifications', 'preferences', did, appViewEnabled] as const,
  },

  // ---- Messages / conversations ----
  messages: {
    all: ['messages'] as const,
    forConvo: (convoId: string) => ['messages', convoId] as const,
    list: (params: { convoId: Maybe<string>; limit: number; did: Maybe<string>; appViewEnabled?: boolean }) =>
      ['messages', params.convoId, params.limit, params.did, params.appViewEnabled] as const,
    unread: (did: Maybe<string>, appViewEnabled?: boolean) =>
      ['messages', 'unread', did, appViewEnabled] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    list: (params: {
      limit: number;
      readState: string | undefined;
      status: string | undefined;
      did: string | undefined;
      appViewEnabled?: boolean;
    }) =>
      ['conversations', params.limit, params.readState, params.status, params.did, params.appViewEnabled] as const,
  },
  convo: (convoId: Maybe<string>, did: Maybe<string>, appViewEnabled?: boolean) =>
    ['convo', convoId, did, appViewEnabled] as const,

  // ---- Posts ----
  post: {
    all: ['post'] as const,
    detail: (params: {
      actor: Maybe<string>;
      rKey: Maybe<string>;
      pdsUrl: Maybe<string>;
      appViewEnabled?: boolean;
    }) => ['post', { actor: params.actor, rKey: params.rKey }, params.pdsUrl, params.appViewEnabled] as const,
  },
  parentPost: (parentUri: Maybe<string>, pdsUrl: Maybe<string>, appViewEnabled?: boolean) =>
    ['parentPost', parentUri, pdsUrl, appViewEnabled] as const,
  rootPost: (rootUri: Maybe<string>, pdsUrl: Maybe<string>, appViewEnabled?: boolean) =>
    ['rootPost', rootUri, pdsUrl, appViewEnabled] as const,
  postThread: {
    all: ['postThread'] as const,
    detail: (postUri: Maybe<string>, pdsUrl: Maybe<string>, appViewEnabled?: boolean) =>
      ['postThread', postUri, pdsUrl, appViewEnabled] as const,
  },
  pinnedPost: {
    all: ['pinnedPost'] as const,
    detail: (pdsUrl: Maybe<string>, uri: Maybe<string>, appViewEnabled?: boolean) =>
      ['pinnedPost', pdsUrl, uri, appViewEnabled] as const,
  },
  postControls: (pdsUrl: Maybe<string>, postUri: Maybe<string>) => ['existingPostControls', pdsUrl, postUri] as const,

  // ---- Feeds & timeline ----
  timeline: {
    all: ['timeline'] as const,
    list: (limit: number, did: string | undefined, appViewEnabled?: boolean) =>
      ['timeline', limit, did, appViewEnabled] as const,
  },
  feed: {
    all: ['feed'] as const,
    detail: (feedUri: Maybe<string>, pdsUrl: Maybe<string>) => ['feed', feedUri, pdsUrl] as const,
  },
  feedGenerators: (feedUris: string[], pdsUrl: Maybe<string>, appViewEnabled?: boolean) =>
    ['feedGenerators', feedUris, pdsUrl, appViewEnabled] as const,
  feeds: (params: {
    actor: Maybe<string>;
    limit: number;
    cursor: Maybe<string>;
    pdsUrl: Maybe<string>;
    appViewEnabled?: boolean;
  }) => ['feeds', params.actor, params.limit, params.cursor, params.pdsUrl, params.appViewEnabled] as const,

  // ---- Author content ----
  author: {
    feed: {
      all: ['authorFeed'] as const,
      forDid: (did: string | undefined) => ['authorFeed', did] as const,
    },
    posts: {
      all: ['authorPosts'] as const,
      forDid: (did: string | undefined) => ['authorPosts', did] as const,
      list: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>, appViewEnabled?: boolean) =>
        ['authorPosts', identifier, limit, pdsUrl, appViewEnabled] as const,
    },
    replies: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>, appViewEnabled?: boolean) =>
      ['authorReplies', identifier, limit, pdsUrl, appViewEnabled] as const,
    media: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>, appViewEnabled?: boolean) =>
      ['authorMedia', identifier, limit, pdsUrl, appViewEnabled] as const,
    reposts: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>, appViewEnabled?: boolean) =>
      ['authorReposts', identifier, limit, pdsUrl, appViewEnabled] as const,
    videos: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>, appViewEnabled?: boolean) =>
      ['authorVideos', identifier, limit, pdsUrl, appViewEnabled] as const,
    repos: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorRepos', identifier, limit, pdsUrl] as const,
    starterpacks: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>, appViewEnabled?: boolean) =>
      ['authorStarterpacks', identifier, limit, pdsUrl, appViewEnabled] as const,
    recipes: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorRecipes', identifier, limit, pdsUrl] as const,
    grainGalleries: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorGrainGalleries', identifier, limit, pdsUrl] as const,
    grainPhotos: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorGrainPhotos', identifier, limit, pdsUrl] as const,
    grainGalleryItems: (identifier: Maybe<string>, pdsUrl: Maybe<string>) =>
      ['authorGrainGalleryItems', identifier, pdsUrl] as const,
    grainPhotoExif: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorGrainPhotoExif', identifier, limit, pdsUrl] as const,
    flashesStories: (identifier: Maybe<string>, pdsUrl: Maybe<string>) =>
      ['authorFlashesStories', identifier, pdsUrl] as const,
    sparkStories: (identifier: Maybe<string>, pdsUrl: Maybe<string>) =>
      ['authorSparkStories', identifier, pdsUrl] as const,
    rpgInventory: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorRpgInventory', identifier, limit, pdsUrl] as const,
    sifaSelf: (identifier: Maybe<string>, pdsUrl: Maybe<string>) =>
      ['authorSifaSelf', identifier, pdsUrl] as const,
    sifaPositions: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorSifaPositions', identifier, limit, pdsUrl] as const,
    sifaEducation: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorSifaEducation', identifier, limit, pdsUrl] as const,
    feeds: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorFeeds', identifier, limit, pdsUrl] as const,
    likes: {
      all: ['authorLikes'] as const,
      list: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
        ['authorLikes', identifier, limit, pdsUrl] as const,
    },
  },

  // ---- Profile ----
  profile: {
    all: ['profile'] as const,
    forDid: (did: Maybe<string>) => ['profile', did] as const,
    detail: (identifier: Maybe<string>, pdsUrl: Maybe<string>, appViewEnabled?: boolean) =>
      ['profile', identifier, pdsUrl, appViewEnabled] as const,
    record: (did: Maybe<string>, pdsUrl: Maybe<string>) =>
      ['profile', 'record', did, pdsUrl] as const,
  },

  // ---- Lists ----
  lists: (pdsUrl: Maybe<string>, target: Maybe<string>, appViewEnabled?: boolean) =>
    ['lists', pdsUrl, target, appViewEnabled] as const,
  list: (pdsUrl: Maybe<string>, listUri: Maybe<string>) => ['list', pdsUrl, listUri] as const,
  listSnapshot: (pdsUrl: Maybe<string>, listUri: Maybe<string>) => ['listSnapshot', pdsUrl, listUri] as const,

  // ---- Mutes / blocks (account-level moderation graph) ----
  mutes: {
    all: ['mutes'] as const,
    list: (did: Maybe<string>, appViewEnabled?: boolean) =>
      ['mutes', 'list', did, appViewEnabled] as const,
  },
  blocks: {
    all: ['blocks'] as const,
    list: (did: Maybe<string>, appViewEnabled?: boolean) =>
      ['blocks', 'list', did, appViewEnabled] as const,
  },
  moderationLists: {
    all: ['moderationLists'] as const,
    forDid: (did: Maybe<string>, appViewEnabled?: boolean) =>
      ['moderationLists', did, appViewEnabled] as const,
  },

  // ---- Preferences ----
  preferences: {
    all: ['preferences'] as const,
    forPds: (pdsUrl: string | undefined, appViewEnabled?: boolean) =>
      ['preferences', pdsUrl, appViewEnabled] as const,
  },
  savedFeeds: (did: string | undefined) => ['savedFeeds', did] as const,
  aiPreferences: (did: string | undefined, pdsUrl: string | undefined) => ['aiPreferences', did, pdsUrl] as const,

  // ---- Search & discovery ----
  search: (params: {
    query: Maybe<string>;
    activeTab: string;
    limit: number;
    sort: string;
    pdsUrl: Maybe<string>;
    appViewEnabled?: boolean;
  }) =>
    ['search', params.query, params.activeTab, params.limit, params.sort, params.pdsUrl, params.appViewEnabled] as const,
  typeaheadActors: (debounced: string, appViewUrl: string | undefined) =>
    ['typeaheadActors', debounced, appViewUrl] as const,
  trendingTopics: (limit: number, appViewUrl: string | undefined, appViewEnabled?: boolean) =>
    ['trendingTopics', limit, appViewUrl, appViewEnabled] as const,
  suggestedFollows: (limit: number, viewerDid: string | undefined) =>
    ['suggestedFollows', limit, viewerDid] as const,

  // ---- Bookmarks ----
  bookmarks: {
    all: ['bookmarks'] as const,
    list: (limit: number, did: string | undefined, appViewEnabled?: boolean) =>
      ['bookmarks', limit, did, appViewEnabled] as const,
  },

  // ---- Misc per-user data ----
  drafts: (did: string | undefined) => ['drafts', did] as const,
  selectedFeed: () => ['selectedFeed'] as const,
  labelers: (pdsUrl: string | undefined, didsCsv: string, appViewEnabled?: boolean) =>
    ['labelers', pdsUrl, didsCsv, appViewEnabled] as const,
  links: (identifier: Maybe<string>, limit: number, did: Maybe<string>) => ['links', identifier, limit, did] as const,

  // ---- Identity / verification ----
  pdsUrl: {
    forDid: (did: Maybe<string>) => ['pdsUrl', 'did', did] as const,
    forHandle: (handle: Maybe<string>) => ['pdsUrl', 'handle', handle] as const,
  },
  handleToDid: (actor: Maybe<string>) => ['handleToDid', actor] as const,
  handleHistory: {
    plc: (identifier: Maybe<string>) => ['handleHistory', 'plc', identifier] as const,
  },
  verifiersForDid: (did: Maybe<string>) => ['verifiersForDid', did] as const,
  keytrace: (handle: Maybe<string>) => ['keytrace', handle] as const,
  germDeclaration: (did: Maybe<string>) => ['germDeclaration', did] as const,
  standardDocument: (did: Maybe<string>, rkey: Maybe<string>) => ['standardDocument', did, rkey] as const,

  // ---- Ozone (moderation tools) ----
  ozone: {
    all: ['ozone'] as const,
    membership: (ozoneDid: Maybe<string>, viewerDid: Maybe<string>) =>
      ['ozone', 'membership', ozoneDid, viewerDid] as const,
    teamMembers: (ozoneDid: Maybe<string>) => ['ozone', 'teamMembers', ozoneDid] as const,
    queue: (ozoneDid: Maybe<string>, filters: unknown) =>
      ['ozone', 'queue', ozoneDid, filters] as const,
    events: (ozoneDid: Maybe<string>, filters: unknown) =>
      ['ozone', 'events', ozoneDid, filters] as const,
    subjectStatus: (ozoneDid: Maybe<string>, subject: Maybe<string>) =>
      ['ozone', 'subjectStatus', ozoneDid, subject] as const,
    subjectEvents: (ozoneDid: Maybe<string>, subject: Maybe<string>) =>
      ['ozone', 'subjectEvents', ozoneDid, subject] as const,
    repo: (ozoneDid: Maybe<string>, did: Maybe<string>) => ['ozone', 'repo', ozoneDid, did] as const,
    record: (ozoneDid: Maybe<string>, uri: Maybe<string>) =>
      ['ozone', 'record', ozoneDid, uri] as const,
    accountTimeline: (ozoneDid: Maybe<string>, did: Maybe<string>) =>
      ['ozone', 'accountTimeline', ozoneDid, did] as const,
    reporterStats: (ozoneDid: Maybe<string>, didsCsv: string) =>
      ['ozone', 'reporterStats', ozoneDid, didsCsv] as const,
    templates: (ozoneDid: Maybe<string>) => ['ozone', 'templates', ozoneDid] as const,
    scheduled: (ozoneDid: Maybe<string>, filters: unknown) =>
      ['ozone', 'scheduled', ozoneDid, filters] as const,
    searchRepos: (ozoneDid: Maybe<string>, q: Maybe<string>) =>
      ['ozone', 'searchRepos', ozoneDid, q] as const,
    labelOptions: (ozoneDid: Maybe<string>) => ['ozone', 'labelOptions', ozoneDid] as const,
  },
} as const;
