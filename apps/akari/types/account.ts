/**
 * Per-account material the DPoP-aware path needs in addition to the shared
 * Account fields. Stored alongside the account in `secureStorage` (encrypted)
 * because losing the private key strands the user — the auth server bound
 * their tokens to it.
 */
type OAuthAccountAuth = {
  /** P-256 private scalar in lowercase hex. Long-lived per account. */
  dpopPrivateKeyHex: string;
  /** Public half of the DPoP keypair, embedded into every proof header. */
  dpopPublicJwk: {
    kty: 'EC';
    crv: 'P-256';
    x: string;
    y: string;
  };
  /** Authorization server endpoints, cached so refresh doesn't re-discover. */
  authServer: {
    issuer: string;
    token_endpoint: string;
  };
  /**
   * Most recently observed `DPoP-Nonce` from the authorization server.
   * Distinct from the PDS nonce — RFC 9449 lets each origin issue its own.
   */
  authServerNonce?: string;
  /** Most recently observed `DPoP-Nonce` from the PDS. */
  pdsNonce?: string;
  /** Unix-seconds expiry of the access token. */
  expiresAt: number;
  /** Space-delimited scope string the auth server actually granted. */
  scope: string;
};

/**
 * Per-account material the Mastodon (and wider fediverse: Pleroma, Akkoma,
 * GoToSocial, …) OAuth path needs. Stored alongside the account in
 * `secureStorage` (encrypted). Mastodon registers our client dynamically
 * per instance, so the `client_secret` issued at registration lives here —
 * the token endpoint requires it on every exchange/refresh.
 */
type MastodonAccountAuth = {
  /** Origin of the home instance, e.g. `https://mastodon.social`. */
  instanceUrl: string;
  /** The instance-local account id (Mastodon `id`), distinct from `did`. */
  accountId: string;
  /** Dynamically-registered OAuth client id for this instance. */
  clientId: string;
  /**
   * Dynamically-registered OAuth client secret for this instance. Mastodon's
   * documented native-app flow returns this on `POST /api/v1/apps` and the
   * token endpoint requires it; it's generated fresh per install, not baked
   * into the bundle.
   */
  clientSecret: string;
  /** Space-delimited scope string the instance actually granted. */
  scope: string;
  /** Token type from the token endpoint — Mastodon issues `Bearer`. */
  tokenType: string;
};

/**
 * Which protocol an account speaks. Drives token style, refresh strategy,
 * and (eventually) which data-layer adapter renders its feeds. Absent on
 * legacy records, which are all atproto — treat `undefined` as `'atproto'`.
 */
export type AccountProvider = 'atproto' | 'mastodon';

export type Account = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  jwtToken: string;
  refreshToken: string;
  pdsUrl?: string;
  /**
   * Protocol backing this account. Optional for backward compatibility:
   * accounts persisted before multi-protocol support have no `provider` and
   * are atproto by definition. New code should branch on
   * `account.provider === 'mastodon'` (or the presence of `account.mastodon`).
   */
  provider?: AccountProvider;
  /**
   * Per-account AppView override. When absent (or `preset === 'default'`)
   * the API client falls back to the app-wide AppView setting. See
   * `utils/appView.ts` for the resolution logic. atproto-only.
   */
  appView?: import('@/utils/appView').AccountAppViewOverride;
  /**
   * Present when the account was created via atproto OAuth. Tells the API
   * client to send `Authorization: DPoP …` with a per-request proof JWT
   * instead of the default `Bearer` header. Absent for handle/app-password
   * accounts — those keep working unchanged.
   */
  oauth?: OAuthAccountAuth;
  /**
   * Present when the account was created via Mastodon/fediverse OAuth.
   * Mutually exclusive with `oauth`. `jwtToken` holds the Bearer access
   * token; there is no DPoP and (by default) no refresh token.
   */
  mastodon?: MastodonAccountAuth;
};
