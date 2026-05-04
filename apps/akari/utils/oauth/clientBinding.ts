import { registerDpopSigner, unregisterDpopSigner } from '@/bluesky-api';
import type { Account } from '@/types/account';
import { storage } from '@/utils/secureStorage';

import { signDpopProof } from './dpop';

/**
 * Tell the bluesky-api client that requests carrying `account.jwtToken`
 * must be DPoP-signed with the keypair on the account record. No-op for
 * handle/app-password accounts (they take the existing Bearer code path).
 *
 * Idempotent — re-binding the same access token replaces the previous
 * signer, so this is safe to call after a token refresh.
 */
export function bindOAuthAccount(account: Account): void {
  if (!account.oauth) return;
  const keypair = {
    privateKeyHex: account.oauth.dpopPrivateKeyHex,
    publicJwk: account.oauth.dpopPublicJwk,
  };
  const accessJwt = account.jwtToken;
  registerDpopSigner(accessJwt, async ({ method, url, nonce }) =>
    signDpopProof({
      keypair,
      htm: method,
      htu: url,
      nonce,
      accessToken: accessJwt,
    }),
  );
}

/** Drop the binding for `account.jwtToken`; pair with `bindOAuthAccount`. */
export function unbindOAuthAccount(account: Account): void {
  unregisterDpopSigner(account.jwtToken);
}

/**
 * App-launch hook: re-register the DPoP signer for the persisted current
 * account when it's OAuth-authenticated. Must run AFTER `bootstrapSecureStorage`
 * (so `storage.getItem` works) and BEFORE the first render — otherwise the
 * home tab's first XRPC call races the binder's `useEffect` and the PDS
 * rejects the access token as "malformed" because it received Bearer style.
 */
export function restoreOAuthBindingFromStorage(): void {
  const currentAccount = storage.getItem('currentAccount');
  if (currentAccount?.oauth) {
    bindOAuthAccount(currentAccount);
  }
}
