import type { DpopKeypair } from './dpop';
import { dpopFetch } from './dpopFetch';
import type { AuthorizationServerMetadata } from './discovery';

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: 'DPoP';
  scope: string;
  expires_in: number;
  /** The DID of the authenticated subject. atproto auth servers populate this. */
  sub?: string;
};

export type ExchangeCodeInput = {
  authServer: AuthorizationServerMetadata;
  clientId: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
  keypair: DpopKeypair;
  /** Most-recent DPoP nonce (e.g. echoed back from PAR). Honored if present. */
  nonce?: string;
};

/**
 * Trade an authorization code for a DPoP-bound access + refresh token pair.
 * The auth server validates the PKCE verifier against the challenge it saw
 * during PAR, and binds the issued access token to the DPoP key whose
 * thumbprint matched the proof on this call.
 */
export async function exchangeCodeForTokens(input: ExchangeCodeInput): Promise<{ tokens: TokenResponse; nonce?: string }> {
  const { response, body, nonce } = await dpopFetch<TokenResponse & { error?: string; error_description?: string }>(
    input.authServer.token_endpoint,
    {
      method: 'POST',
      body: {
        grant_type: 'authorization_code',
        client_id: input.clientId,
        redirect_uri: input.redirectUri,
        code: input.code,
        code_verifier: input.codeVerifier,
      },
      keypair: input.keypair,
      nonce: input.nonce,
    },
  );

  if (!response.ok || !body?.access_token) {
    const reason = body?.error_description ?? body?.error ?? `HTTP ${response.status}`;
    throw new Error(`token exchange failed: ${reason}`);
  }

  return { tokens: body, nonce };
}

export type RefreshTokenInput = {
  authServer: AuthorizationServerMetadata;
  clientId: string;
  refreshToken: string;
  keypair: DpopKeypair;
  nonce?: string;
};

/**
 * Trade a refresh token for a fresh access token. atproto refresh tokens are
 * single-use and rotated — the response includes a *new* `refresh_token`
 * that callers must persist in place of the old one.
 */
export async function refreshTokens(input: RefreshTokenInput): Promise<{ tokens: TokenResponse; nonce?: string }> {
  const { response, body, nonce } = await dpopFetch<TokenResponse & { error?: string; error_description?: string }>(
    input.authServer.token_endpoint,
    {
      method: 'POST',
      body: {
        grant_type: 'refresh_token',
        client_id: input.clientId,
        refresh_token: input.refreshToken,
      },
      keypair: input.keypair,
      nonce: input.nonce,
    },
  );

  if (!response.ok || !body?.access_token) {
    const reason = body?.error_description ?? body?.error ?? `HTTP ${response.status}`;
    // Carry the status + OAuth error code so the refresh interceptor can tell
    // a dead refresh token (`invalid_grant`) apart from a transient failure
    // (5xx, network, an unresolved DPoP-nonce handshake) and only sign the
    // user out for the former.
    const err = new Error(`token refresh failed: ${reason}`) as Error & {
      status?: number;
      oauthError?: string;
    };
    err.status = response.status;
    err.oauthError = body?.error;
    throw err;
  }

  return { tokens: body, nonce };
}
