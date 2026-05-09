/**
 * Single source of truth for akari's OAuth scope catalog. Both
 * `utils/oauth/config.ts` (the TS app code) and `scripts/sync-oauth-meta.js`
 * (the build-time metadata generator) import from here, which keeps the
 * scope strings in the hosted client metadata in lock-step with what
 * the picker offers and `oauthSignIn` requests.
 *
 * Plain JS so node can require it without compilation.
 */

/** @typedef {'create' | 'update' | 'delete'} RepoAction */

/**
 * @typedef {Object} OAuthFlatScope
 * @property {string} id Unique key. When `tokens` is omitted, `id` is
 *   also the literal scope string sent to the auth server.
 * @property {string[]} [tokens] Optional list of literal scope strings
 *   this picker row maps to. Useful for grouping (e.g. all
 *   `rpc:app.bsky.*` scopes under one toggle).
 * @property {boolean} required
 * @property {boolean} defaultEnabled
 * @property {string} labelKey
 * @property {string} descriptionKey
 */

/**
 * @typedef {Object} OAuthRepoScope
 * @property {string} collection
 * @property {RepoAction[]} actions
 * @property {RepoAction[]} defaultActions
 * @property {RepoAction[]} [requiredActions] Subset of `actions` that the
 *   picker must keep on — without these the app's core features
 *   (posting, liking, following, blocking, etc.) would break.
 * @property {string} labelKey
 * @property {string} descriptionKey
 */

// Bluesky AppView procedures akari calls. atproto OAuth requires one
// `rpc:<NSID>?aud=<DID>` scope token per procedure; the auth server
// rejects the flow with "Missing required scope rpc:…" otherwise.
const bskyAppviewProcedures = [
  'app.bsky.actor.getPreferences',
  'app.bsky.actor.getProfile',
  'app.bsky.actor.getProfiles',
  'app.bsky.actor.getSuggestions',
  'app.bsky.actor.putPreferences',
  'app.bsky.actor.searchActors',
  'app.bsky.actor.searchActorsTypeahead',
  'app.bsky.bookmark.createBookmark',
  'app.bsky.bookmark.deleteBookmark',
  'app.bsky.bookmark.getBookmarks',
  'app.bsky.feed.getActorFeeds',
  'app.bsky.feed.getActorLikes',
  'app.bsky.feed.getAuthorFeed',
  'app.bsky.feed.getFeed',
  'app.bsky.feed.getFeedGenerator',
  'app.bsky.feed.getFeedGenerators',
  'app.bsky.feed.getLikes',
  'app.bsky.feed.getListFeed',
  'app.bsky.feed.getPostThread',
  'app.bsky.feed.getPosts',
  'app.bsky.feed.getQuotes',
  'app.bsky.feed.getRepostedBy',
  'app.bsky.feed.getSuggestedFeeds',
  'app.bsky.feed.getTimeline',
  'app.bsky.feed.searchPosts',
  'app.bsky.feed.sendInteractions',
  'app.bsky.graph.getActorStarterPacks',
  'app.bsky.graph.getBlocks',
  'app.bsky.graph.getFollowers',
  'app.bsky.graph.getFollows',
  'app.bsky.graph.getKnownFollowers',
  'app.bsky.graph.getList',
  'app.bsky.graph.getListBlocks',
  'app.bsky.graph.getListMutes',
  'app.bsky.graph.getLists',
  'app.bsky.graph.getMutes',
  'app.bsky.graph.getRelationships',
  'app.bsky.graph.getStarterPack',
  'app.bsky.graph.getStarterPacks',
  'app.bsky.graph.getSuggestedFollowsByActor',
  'app.bsky.graph.muteActor',
  'app.bsky.graph.muteActorList',
  'app.bsky.graph.muteThread',
  'app.bsky.graph.unmuteActor',
  'app.bsky.graph.unmuteActorList',
  'app.bsky.graph.unmuteThread',
  'app.bsky.labeler.getServices',
  'app.bsky.notification.getUnreadCount',
  'app.bsky.notification.listNotifications',
  'app.bsky.notification.putPreferences',
  'app.bsky.notification.registerPush',
  'app.bsky.notification.updateSeen',
  'app.bsky.unspecced.getPopularFeedGenerators',
  'app.bsky.unspecced.getSuggestedFeeds',
  'app.bsky.unspecced.getSuggestedUsers',
  'app.bsky.unspecced.getTrendingTopics',
  'app.bsky.unspecced.getTrends',
];

// Chat-service procedures (separate audience).
const bskyChatProcedures = [
  'chat.bsky.actor.deleteAccount',
  'chat.bsky.actor.exportAccountData',
  'chat.bsky.convo.acceptConvo',
  'chat.bsky.convo.deleteMessageForSelf',
  'chat.bsky.convo.getConvo',
  'chat.bsky.convo.getConvoForMembers',
  'chat.bsky.convo.getLog',
  'chat.bsky.convo.getMessages',
  'chat.bsky.convo.leaveConvo',
  'chat.bsky.convo.listConvos',
  'chat.bsky.convo.muteConvo',
  'chat.bsky.convo.sendMessage',
  'chat.bsky.convo.sendMessageBatch',
  'chat.bsky.convo.unmuteConvo',
  'chat.bsky.convo.updateAllRead',
  'chat.bsky.convo.updateRead',
  'chat.bsky.moderation.getActorMetadata',
  'chat.bsky.moderation.getMessageContext',
  'chat.bsky.moderation.updateActorAccess',
];

/** @type {OAuthFlatScope[]} */
const flatScopes = [
  {
    id: 'atproto',
    required: true,
    defaultEnabled: true,
    labelKey: 'oauth.scopes.atproto.label',
    descriptionKey: 'oauth.scopes.atproto.description',
  },
  // bsky.social's auth server treats `transition:chat.bsky` as a strict
  // subset of `transition:generic` and rejects the request when chat is
  // asked for without generic also being requested + registered. We
  // keep generic as a coarse legacy scope alongside the fine-grained
  // `repo:*` ones; the user can untick it in the picker if they want.
  {
    id: 'transition:generic',
    required: false,
    defaultEnabled: true,
    labelKey: 'oauth.scopes.generic.label',
    descriptionKey: 'oauth.scopes.generic.description',
  },
  {
    id: 'transition:chat.bsky',
    required: false,
    defaultEnabled: true,
    labelKey: 'oauth.scopes.chat.label',
    descriptionKey: 'oauth.scopes.chat.description',
  },
  // Bluesky AppView RPC scopes. The auth server enforces these
  // per-procedure — wildcards aren't honored at the moment — so we
  // enumerate every endpoint akari calls. One picker row, many tokens.
  // When the list grows, add the new procedure here AND the URL is
  // already covered by the same audience-specific aud parameter.
  {
    id: 'bskyAppview',
    tokens: bskyAppviewProcedures.map(
      (proc) => `rpc:${proc}?aud=did:web:api.bsky.app#bsky_appview`,
    ),
    required: false,
    defaultEnabled: true,
    labelKey: 'oauth.scopes.bskyAppview.label',
    descriptionKey: 'oauth.scopes.bskyAppview.description',
  },
  {
    id: 'bskyChatRpc',
    tokens: bskyChatProcedures.map(
      (proc) => `rpc:${proc}?aud=did:web:api.bsky.chat#bsky_chat`,
    ),
    required: false,
    defaultEnabled: true,
    labelKey: 'oauth.scopes.bskyChatRpc.label',
    descriptionKey: 'oauth.scopes.bskyChatRpc.description',
  },
  {
    id: 'bskyVideoRpc',
    tokens: [
      'rpc:app.bsky.video.getJobStatus?aud=did:web:video.bsky.app#bsky_video',
      'rpc:app.bsky.video.getUploadLimits?aud=did:web:video.bsky.app#bsky_video',
      'rpc:app.bsky.video.uploadVideo?aud=did:web:video.bsky.app#bsky_video',
    ],
    required: false,
    defaultEnabled: true,
    labelKey: 'oauth.scopes.bskyVideoRpc.label',
    descriptionKey: 'oauth.scopes.bskyVideoRpc.description',
  },
];

/** @type {OAuthRepoScope[]} */
const repoScopes = [
  {
    collection: 'app.bsky.actor.profile',
    actions: ['update'],
    defaultActions: ['update'],
    labelKey: 'oauth.scopes.profile.label',
    descriptionKey: 'oauth.scopes.profile.description',
  },
  {
    collection: 'app.bsky.feed.post',
    actions: ['create', 'update', 'delete'],
    defaultActions: ['create', 'update', 'delete'],
    requiredActions: ['create', 'delete'],
    labelKey: 'oauth.scopes.post.label',
    descriptionKey: 'oauth.scopes.post.description',
  },
  {
    collection: 'app.bsky.feed.threadgate',
    actions: ['create', 'update', 'delete'],
    defaultActions: ['create', 'update', 'delete'],
    labelKey: 'oauth.scopes.threadgate.label',
    descriptionKey: 'oauth.scopes.threadgate.description',
  },
  {
    collection: 'app.bsky.feed.postgate',
    actions: ['create', 'update', 'delete'],
    defaultActions: ['create', 'update', 'delete'],
    labelKey: 'oauth.scopes.postgate.label',
    descriptionKey: 'oauth.scopes.postgate.description',
  },
  {
    collection: 'app.bsky.feed.like',
    actions: ['create', 'delete'],
    defaultActions: ['create', 'delete'],
    requiredActions: ['create', 'delete'],
    labelKey: 'oauth.scopes.like.label',
    descriptionKey: 'oauth.scopes.like.description',
  },
  {
    collection: 'app.bsky.feed.repost',
    actions: ['create', 'delete'],
    defaultActions: ['create', 'delete'],
    requiredActions: ['create', 'delete'],
    labelKey: 'oauth.scopes.repost.label',
    descriptionKey: 'oauth.scopes.repost.description',
  },
  {
    collection: 'app.bsky.graph.follow',
    actions: ['create', 'delete'],
    defaultActions: ['create', 'delete'],
    requiredActions: ['create', 'delete'],
    labelKey: 'oauth.scopes.follow.label',
    descriptionKey: 'oauth.scopes.follow.description',
  },
  {
    collection: 'app.bsky.graph.block',
    actions: ['create', 'delete'],
    defaultActions: ['create', 'delete'],
    requiredActions: ['create', 'delete'],
    labelKey: 'oauth.scopes.block.label',
    descriptionKey: 'oauth.scopes.block.description',
  },
  {
    collection: 'app.bsky.graph.list',
    actions: ['create', 'update', 'delete'],
    defaultActions: ['create', 'update', 'delete'],
    labelKey: 'oauth.scopes.list.label',
    descriptionKey: 'oauth.scopes.list.description',
  },
  {
    collection: 'app.bsky.graph.listitem',
    actions: ['create', 'delete'],
    defaultActions: ['create', 'delete'],
    labelKey: 'oauth.scopes.listitem.label',
    descriptionKey: 'oauth.scopes.listitem.description',
  },
  {
    collection: 'pub.leaflet.publication',
    actions: ['create', 'update', 'delete'],
    defaultActions: ['create', 'update', 'delete'],
    labelKey: 'oauth.scopes.leafletPublication.label',
    descriptionKey: 'oauth.scopes.leafletPublication.description',
  },
  {
    collection: 'pub.leaflet.document',
    actions: ['create', 'update', 'delete'],
    defaultActions: ['create', 'update', 'delete'],
    labelKey: 'oauth.scopes.leafletDocument.label',
    descriptionKey: 'oauth.scopes.leafletDocument.description',
  },
  {
    collection: 'community.lexicon.preference.ai',
    actions: ['create', 'update', 'delete'],
    defaultActions: ['create', 'update', 'delete'],
    labelKey: 'oauth.scopes.aiPreference.label',
    descriptionKey: 'oauth.scopes.aiPreference.description',
  },
  {
    collection: 'social.popfeed.feed.review',
    actions: ['create', 'update', 'delete'],
    defaultActions: ['create', 'update', 'delete'],
    labelKey: 'oauth.scopes.popfeedReview.label',
    descriptionKey: 'oauth.scopes.popfeedReview.description',
  },
  {
    collection: 'exchange.recipe.recipe',
    actions: ['create', 'update', 'delete'],
    defaultActions: ['create', 'update', 'delete'],
    labelKey: 'oauth.scopes.recipe.label',
    descriptionKey: 'oauth.scopes.recipe.description',
  },
  {
    collection: 'blue.linkat.board',
    actions: ['create', 'update', 'delete'],
    defaultActions: ['create', 'update', 'delete'],
    labelKey: 'oauth.scopes.linkatBoard.label',
    descriptionKey: 'oauth.scopes.linkatBoard.description',
  },
];

function buildFullScopeString() {
  const tokens = [];
  for (const flat of flatScopes) {
    if (flat.tokens) {
      for (const t of flat.tokens) tokens.push(t);
    } else {
      tokens.push(flat.id);
    }
  }
  for (const repo of repoScopes) {
    for (const action of repo.actions) {
      tokens.push(`repo:${repo.collection}?action=${action}`);
    }
  }
  return tokens.join(' ');
}

module.exports = {
  flatScopes,
  repoScopes,
  buildFullScopeString,
};
