import type { DpopKeypair } from './dpop';
import { dpopFetch } from './dpopFetch';
import type { AuthorizationServerMetadata } from './discovery';

export type PushedAuthorizationRequestInput = {
  authServer: AuthorizationServerMetadata;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  /** The user's handle, fed to the server as a `login_hint` so the consent UI knows who's signing in. */
  loginHint?: string;
  keypair: DpopKeypair;
};

type PushedAuthorizationResponse = {
  request_uri: string;
  expires_in: number;
};

/**
 * Push the authorization request parameters to the auth server's PAR
 * endpoint. The endpoint returns an opaque `request_uri` that the client
 * passes (instead of the raw params) when redirecting the user through the
 * authorize endpoint — keeping the front-channel URL short and free of
 * sensitive parameters.
 */
export async function pushAuthorizationRequest(
  input: PushedAuthorizationRequestInput,
): Promise<{ requestUri: string; expiresIn: number; nonce?: string }> {
  const body: Record<string, string> = {
    client_id: input.clientId,
    response_type: 'code',
    redirect_uri: input.redirectUri,
    scope: input.scope,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: 'S256',
  };
  if (input.loginHint) body.login_hint = input.loginHint;

  const { response, body: json, nonce } = await dpopFetch<PushedAuthorizationResponse & { error?: string; error_description?: string }>(
    input.authServer.pushed_authorization_request_endpoint,
    { method: 'POST', body, keypair: input.keypair },
  );

  if (!response.ok || !json?.request_uri) {
    const reason = json?.error_description ?? json?.error ?? `HTTP ${response.status}`;
    throw new Error(`PAR failed: ${reason}`);
  }

  return { requestUri: json.request_uri, expiresIn: json.expires_in, nonce };
}
