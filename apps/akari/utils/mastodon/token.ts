/**
 * Mastodon OAuth token exchange + identity lookup.
 *
 * Plain OAuth 2.0 authorization-code flow with a confidential-ish client:
 * the per-instance `client_secret` (from dynamic registration) is sent on the
 * token request. No DPoP, no PKCE — the widest-compatible shape across
 * Mastodon, Pleroma, Akkoma and GoToSocial. Mastodon access tokens do not
 * expire and the standard flow issues no refresh token, so there is no
 * refresh path here.
 */

export type MastodonTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  /** Unix-seconds issuance time. Mastodon tokens carry no expiry. */
  created_at: number;
};

export type ExchangeMastodonCodeInput = {
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  scope: string;
};

/** Trade an authorization code for a Bearer access token. */
export async function exchangeMastodonCode(
  input: ExchangeMastodonCodeInput,
): Promise<MastodonTokenResponse> {
  const res = await fetch(`${input.instanceUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      code: input.code,
      scope: input.scope,
    }),
  });

  const json = (await res.json().catch(() => null)) as
    | (MastodonTokenResponse & { error?: string; error_description?: string })
    | null;

  if (!res.ok || !json?.access_token) {
    const reason = json?.error_description ?? json?.error ?? `HTTP ${res.status}`;
    throw new Error(`Mastodon token exchange failed: ${reason}`);
  }

  return json;
}

/**
 * The subset of Mastodon's `CredentialAccount` we read. Covers both the
 * post-signin account-record build (id / username / acct / display_name /
 * avatar / url) and the onboarding screen's incomplete-profile detection
 * + form prefill (header, note, source.note, discoverable, indexable).
 *
 * `note` is rendered-HTML; `source.note` is the raw markdown the server
 * stored, which is what the edit form needs to round-trip. `discoverable`
 * and `indexable` are nullable on older servers (the field was added in
 * Mastodon 3.0 and 4.2 respectively); we treat null as "not opted in".
 */
export type MastodonCredentialAccount = {
  id: string;
  username: string;
  /** `user` for local accounts, `user@domain` for remote — we always have local here. */
  acct: string;
  display_name: string;
  avatar: string;
  /** Profile banner. Default placeholder is the instance's `headers/original/missing.png`. */
  header: string;
  /** Bio rendered as HTML (links + mentions resolved). */
  note: string;
  /** Canonical profile URL, used as a globally-unique account key. */
  url: string;
  discoverable: boolean | null;
  /** Mastodon 4.2+. Older servers omit the field — treat absence as `null`. */
  indexable?: boolean | null;
  /** Editable copies of mutable fields (the raw text the user submitted, not the
   * rendered/HTML view). Mastodon returns this on `verify_credentials` only. */
  source?: {
    note: string;
    privacy?: string;
    sensitive?: boolean;
    language?: string | null;
  };
};

/** Fetch the authenticated user's account via `verify_credentials`. */
export async function verifyMastodonCredentials(
  instanceUrl: string,
  accessToken: string,
): Promise<MastodonCredentialAccount> {
  const res = await fetch(`${instanceUrl}/api/v1/accounts/verify_credentials`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Fetching your Mastodon profile failed (HTTP ${res.status}).`);
  }

  const json = (await res.json().catch(() => null)) as MastodonCredentialAccount | null;
  if (!json?.id || !json.url) {
    throw new Error('Mastodon returned an incomplete profile.');
  }
  return json;
}
