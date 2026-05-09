/**
 * Single source of truth for akari's OAuth scope catalog. Both
 * `utils/oauth/config.ts` (the TS app code) and `scripts/sync-oauth-meta.js`
 * (the build-time metadata generator) import from here, which keeps the
 * scope strings in the hosted client metadata in lock-step with what
 * `oauthSignIn` actually requests on PAR.
 *
 * For now we ask for the legacy broad `transition:*` scopes plus the
 * blob upload scope. That's the well-trodden path on bsky.social — the
 * fine-grained `rpc:` / `repo:` / `include:` model isn't fully wired up
 * server-side yet (see git history for the long round of failed
 * attempts). Re-introduce a per-collection picker once atproto's auth
 * server stably honors it.
 *
 * Plain JS so node can require it without compilation.
 */

/** @typedef {'create' | 'update' | 'delete'} RepoAction */

/**
 * @typedef {Object} OAuthFlatScope
 * @property {string} id
 * @property {string[]} [tokens]
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
 * @property {RepoAction[]} [requiredActions]
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
  {
    id: 'transition:generic',
    required: true,
    defaultEnabled: true,
    labelKey: 'oauth.scopes.generic.label',
    descriptionKey: 'oauth.scopes.generic.description',
  },
  {
    id: 'transition:chat.bsky',
    required: true,
    defaultEnabled: true,
    labelKey: 'oauth.scopes.chat.label',
    descriptionKey: 'oauth.scopes.chat.description',
  },
  {
    id: 'blobs',
    tokens: ['blobs?accept=image/*&accept=video/*'],
    required: true,
    defaultEnabled: true,
    labelKey: 'oauth.scopes.blobs.label',
    descriptionKey: 'oauth.scopes.blobs.description',
  },
];

// Per-collection repo scopes for record CRUD on the user's PDS.
// transition:generic already grants writes to most of these, but
// declaring them explicitly is a no-op on the bsky side and gives us
// explicit grants for non-bsky lexicons (leaflet, recipe, popfeed,
// linkat, etc.) without depending on transition:generic semantics.
/** @type {OAuthRepoScope[]} */
const repoScopes = [
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
