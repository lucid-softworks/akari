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

/** @type {OAuthFlatScope[]} */
const flatScopes = [
  {
    id: 'atproto',
    required: true,
    defaultEnabled: true,
    labelKey: 'oauth.scopes.atproto.label',
    descriptionKey: 'oauth.scopes.atproto.description',
  },
  // atproto OAuth meta-scopes — the AppView and chat services publish
  // permission *sets* (`app.bsky.authFullClient`, `chat.bsky.authFullClient`)
  // that bundle every rpc/repo permission akari needs in one token.
  // Format and identifiers are documented in
  //   https://github.com/bluesky-social/atproto/discussions/4437
  // Using these instead of enumerating every procedure keeps the scope
  // string short and avoids drift as bsky adds new endpoints.
  {
    id: 'bskyAppview',
    tokens: ['include:app.bsky.authFullClient?aud=did:web:api.bsky.app#bsky_appview'],
    required: false,
    defaultEnabled: true,
    labelKey: 'oauth.scopes.bskyAppview.label',
    descriptionKey: 'oauth.scopes.bskyAppview.description',
  },
  {
    id: 'bskyChat',
    tokens: ['include:chat.bsky.authFullClient?aud=did:web:api.bsky.chat#bsky_chat'],
    required: false,
    defaultEnabled: true,
    labelKey: 'oauth.scopes.bskyChat.label',
    descriptionKey: 'oauth.scopes.bskyChat.description',
  },
  // Blob upload scope — needed for posting images and videos. The
  // `accept` parameters narrow the MIME types the token can upload;
  // matching what akari actually attaches.
  {
    id: 'blobs',
    tokens: ['blobs?accept=image/*&accept=video/*'],
    required: false,
    defaultEnabled: true,
    labelKey: 'oauth.scopes.blobs.label',
    descriptionKey: 'oauth.scopes.blobs.description',
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
