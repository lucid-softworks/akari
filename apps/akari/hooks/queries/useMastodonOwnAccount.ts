import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { verifyMastodonCredentials, type MastodonCredentialAccount } from '@/utils/mastodon/token';

/**
 * Fetches the current Mastodon account's full `CredentialAccount` via
 * `verify_credentials`. Used by the onboarding screen to:
 *   1. decide whether the profile is incomplete (incomplete heuristic
 *      lives in `utils/mastodon/profile.ts`), and
 *   2. prefill the form with whatever values are already set.
 *
 * Disabled for atproto accounts. Cached aggressively because the only
 * code path that actually mutates the profile (the onboarding screen
 * itself) writes through to this query key on success.
 */
export function useMastodonOwnAccount() {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const instanceUrl = currentAccount?.mastodon?.instanceUrl;
  const accountId = currentAccount?.mastodon?.accountId;

  return useQuery<MastodonCredentialAccount>({
    queryKey: queryKeys.mastodonOwnAccount.forInstance(instanceUrl, accountId),
    queryFn: async () => {
      if (!instanceUrl || !token) {
        throw new Error('useMastodonOwnAccount: missing instance or token.');
      }
      return await verifyMastodonCredentials(instanceUrl, token);
    },
    enabled: Boolean(instanceUrl && token && currentAccount?.mastodon),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
}
