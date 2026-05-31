import type { Account } from '@/types/account';

import type { MastodonAppCredentials } from './app';
import type { MastodonCredentialAccount, MastodonTokenResponse } from './token';

export type BuildMastodonAccountInput = {
  instanceUrl: string;
  app: MastodonAppCredentials;
  token: MastodonTokenResponse;
  credentials: MastodonCredentialAccount;
};

/**
 * Assemble a persisted {@link Account} from a completed Mastodon sign-in.
 *
 * The shared `Account.did` field doubles as the cross-protocol account key
 * (the account map, switcher, and per-account cache scoping all key on it).
 * Mastodon has no DID, so we use the canonical profile URL — globally unique
 * and stable — as the key. `handle` is rendered as `user@instance` to match
 * how the fediverse addresses accounts.
 */
export function buildMastodonAccount(input: BuildMastodonAccountInput): Account {
  const { instanceUrl, app, token, credentials } = input;
  const host = instanceUrl.replace(/^https?:\/\//, '');

  return {
    did: credentials.url,
    handle: `${credentials.username}@${host}`,
    displayName: credentials.display_name || undefined,
    avatar: credentials.avatar || undefined,
    jwtToken: token.access_token,
    // Mastodon's standard flow issues no refresh token; tokens are long-lived.
    refreshToken: '',
    provider: 'mastodon',
    mastodon: {
      instanceUrl,
      accountId: credentials.id,
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      scope: token.scope || app.scope,
      tokenType: token.token_type || 'Bearer',
    },
  };
}
