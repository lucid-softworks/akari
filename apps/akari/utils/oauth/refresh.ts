import type { Account } from '@/types/account';

import { bindOAuthAccount, unbindOAuthAccount } from './clientBinding';
import { OAUTH_CLIENT_ID } from './config';
import type { AuthorizationServerMetadata } from './discovery';
import { refreshTokens } from './token';

/**
 * Trade `account.refreshToken` for a fresh DPoP-bound access token using
 * the auth server's token endpoint. atproto refresh tokens are single-use
 * and rotated, so the response carries a new `refresh_token` we must
 * persist in place of the old one.
 *
 * Side effect: re-keys the DPoP signer registry from the old access token
 * to the new one, so the next authenticated XRPC call signs proofs with
 * the correct `ath` claim.
 *
 * Returns the updated Account; caller is responsible for writing it to
 * react-query / secureStorage. Throws on rejection — caller should treat
 * that as session-expired and route the user back to sign-in.
 */
export async function refreshOAuthSession(account: Account): Promise<Account> {
  if (!account.oauth) {
    throw new Error('refreshOAuthSession called on a non-OAuth account');
  }

  const keypair = {
    privateKeyHex: account.oauth.dpopPrivateKeyHex,
    publicJwk: account.oauth.dpopPublicJwk,
  };

  // refreshTokens only reads `token_endpoint`; the rest are placeholders so
  // we don't have to re-discover the full metadata document on every refresh.
  const authServer: AuthorizationServerMetadata = {
    issuer: account.oauth.authServer.issuer,
    token_endpoint: account.oauth.authServer.token_endpoint,
    authorization_endpoint: '',
    pushed_authorization_request_endpoint: '',
  };

  const { tokens, nonce } = await refreshTokens({
    authServer,
    clientId: OAUTH_CLIENT_ID,
    refreshToken: account.refreshToken,
    keypair,
    nonce: account.oauth.authServerNonce,
  });

  if (!tokens.refresh_token) {
    throw new Error('OAuth refresh response missing rotated refresh_token');
  }

  const refreshedAccount: Account = {
    ...account,
    jwtToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    oauth: {
      ...account.oauth,
      authServerNonce: nonce ?? account.oauth.authServerNonce,
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      scope: tokens.scope,
    },
  };

  unbindOAuthAccount(account);
  bindOAuthAccount(refreshedAccount);

  return refreshedAccount;
}
