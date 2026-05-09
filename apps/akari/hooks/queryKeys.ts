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
  accountProfiles: (dids: (string | undefined)[] | undefined) => ['accountProfiles', dids] as const,

  // ---- Notifications ----
  notifications: {
    all: ['notifications'] as const,
    list: (params: {
      limit: number;
      reasons: string[] | undefined;
      priority: boolean | undefined;
      did: string | undefined;
    }) => ['notifications', 'list', params.limit, params.reasons, params.priority, params.did] as const,
    unread: (did: string | undefined) => ['notifications', 'unread', did] as const,
    preferences: (did: string | undefined) =>
      ['notifications', 'preferences', did] as const,
  },

  // ---- Messages / conversations ----
  messages: {
    all: ['messages'] as const,
    forConvo: (convoId: string) => ['messages', convoId] as const,
    list: (params: { convoId: Maybe<string>; limit: number; did: Maybe<string> }) =>
      ['messages', params.convoId, params.limit, params.did] as const,
    unread: (did: Maybe<string>) => ['messages', 'unread', did] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    list: (params: { limit: number; readState: string | undefined; status: string | undefined; did: string | undefined }) =>
      ['conversations', params.limit, params.readState, params.status, params.did] as const,
  },
  convo: (convoId: Maybe<string>, did: Maybe<string>) => ['convo', convoId, did] as const,

  // ---- Posts ----
  post: {
    all: ['post'] as const,
    detail: (params: { actor: Maybe<string>; rKey: Maybe<string>; pdsUrl: Maybe<string> }) =>
      ['post', { actor: params.actor, rKey: params.rKey }, params.pdsUrl] as const,
  },
  parentPost: (parentUri: Maybe<string>, pdsUrl: Maybe<string>) => ['parentPost', parentUri, pdsUrl] as const,
  rootPost: (rootUri: Maybe<string>, pdsUrl: Maybe<string>) => ['rootPost', rootUri, pdsUrl] as const,
  postThread: {
    all: ['postThread'] as const,
    detail: (postUri: Maybe<string>, pdsUrl: Maybe<string>) => ['postThread', postUri, pdsUrl] as const,
  },
  pinnedPost: {
    all: ['pinnedPost'] as const,
    detail: (pdsUrl: Maybe<string>, uri: Maybe<string>) => ['pinnedPost', pdsUrl, uri] as const,
  },
  postControls: (pdsUrl: Maybe<string>, postUri: Maybe<string>) => ['existingPostControls', pdsUrl, postUri] as const,

  // ---- Feeds & timeline ----
  timeline: {
    all: ['timeline'] as const,
    list: (limit: number, did: string | undefined) => ['timeline', limit, did] as const,
  },
  feed: {
    all: ['feed'] as const,
    detail: (feedUri: Maybe<string>, pdsUrl: Maybe<string>) => ['feed', feedUri, pdsUrl] as const,
  },
  feedGenerators: (feedUris: string[], pdsUrl: Maybe<string>) => ['feedGenerators', feedUris, pdsUrl] as const,
  feeds: (params: { actor: Maybe<string>; limit: number; cursor: Maybe<string>; pdsUrl: Maybe<string> }) =>
    ['feeds', params.actor, params.limit, params.cursor, params.pdsUrl] as const,

  // ---- Author content ----
  author: {
    feed: {
      all: ['authorFeed'] as const,
      forDid: (did: string | undefined) => ['authorFeed', did] as const,
    },
    posts: {
      all: ['authorPosts'] as const,
      forDid: (did: string | undefined) => ['authorPosts', did] as const,
      list: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
        ['authorPosts', identifier, limit, pdsUrl] as const,
    },
    replies: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorReplies', identifier, limit, pdsUrl] as const,
    media: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorMedia', identifier, limit, pdsUrl] as const,
    videos: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorVideos', identifier, limit, pdsUrl] as const,
    repos: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorRepos', identifier, limit, pdsUrl] as const,
    starterpacks: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorStarterpacks', identifier, limit, pdsUrl] as const,
    recipes: (identifier: Maybe<string>, limit: number, pdsUrl: Maybe<string>) =>
      ['authorRecipes', identifier, limit, pdsUrl] as const,
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
    detail: (identifier: Maybe<string>, pdsUrl: Maybe<string>) => ['profile', identifier, pdsUrl] as const,
    record: (did: Maybe<string>, pdsUrl: Maybe<string>) =>
      ['profile', 'record', did, pdsUrl] as const,
  },

  // ---- Lists ----
  lists: (pdsUrl: Maybe<string>, target: Maybe<string>) => ['lists', pdsUrl, target] as const,
  list: (pdsUrl: Maybe<string>, listUri: Maybe<string>) => ['list', pdsUrl, listUri] as const,
  listSnapshot: (pdsUrl: Maybe<string>, listUri: Maybe<string>) => ['listSnapshot', pdsUrl, listUri] as const,

  // ---- Mutes / blocks (account-level moderation graph) ----
  mutes: {
    all: ['mutes'] as const,
    list: (did: Maybe<string>) => ['mutes', 'list', did] as const,
  },
  blocks: {
    all: ['blocks'] as const,
    list: (did: Maybe<string>) => ['blocks', 'list', did] as const,
  },
  moderationLists: {
    all: ['moderationLists'] as const,
    forDid: (did: Maybe<string>) => ['moderationLists', did] as const,
  },

  // ---- Preferences ----
  preferences: {
    all: ['preferences'] as const,
    forPds: (pdsUrl: string | undefined) => ['preferences', pdsUrl] as const,
  },
  savedFeeds: (did: string | undefined) => ['savedFeeds', did] as const,
  aiPreferences: (did: string | undefined, pdsUrl: string | undefined) => ['aiPreferences', did, pdsUrl] as const,

  // ---- Search & discovery ----
  search: (params: { query: Maybe<string>; activeTab: string; limit: number; sort: string; pdsUrl: Maybe<string> }) =>
    ['search', params.query, params.activeTab, params.limit, params.sort, params.pdsUrl] as const,
  typeaheadActors: (debounced: string, appViewUrl: string | undefined) =>
    ['typeaheadActors', debounced, appViewUrl] as const,
  trendingTopics: (limit: number, appViewUrl: string | undefined) => ['trendingTopics', limit, appViewUrl] as const,

  // ---- Bookmarks ----
  bookmarks: {
    all: ['bookmarks'] as const,
    list: (limit: number, did: string | undefined) => ['bookmarks', limit, did] as const,
  },

  // ---- Misc per-user data ----
  drafts: (did: string | undefined) => ['drafts', did] as const,
  selectedFeed: () => ['selectedFeed'] as const,
  labelers: (pdsUrl: string | undefined, didsCsv: string) => ['labelers', pdsUrl, didsCsv] as const,
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
} as const;
