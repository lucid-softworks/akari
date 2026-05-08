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

export type Account = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  jwtToken: string;
  refreshToken: string;
  pdsUrl?: string;
  /**
   * Per-account AppView override. When absent (or `preset === 'default'`)
   * the API client falls back to the app-wide AppView setting. See
   * `utils/appView.ts` for the resolution logic.
   */
  appView?: import('@/utils/appView').AccountAppViewOverride;
  /**
   * Present when the account was created via atproto OAuth. Tells the API
   * client to send `Authorization: DPoP …` with a per-request proof JWT
   * instead of the default `Bearer` header. Absent for handle/app-password
   * accounts — those keep working unchanged.
   */
  oauth?: OAuthAccountAuth;
};
