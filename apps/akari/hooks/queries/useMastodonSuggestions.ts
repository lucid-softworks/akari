import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { fetchMastodonSuggestions } from '@/utils/mastodon/suggestions';
import type { MastodonSuggestion } from '@/utils/mastodon/types';

/**
 * Suggested-follow list for the current Mastodon account. Used by the
 * follow-people-to-get-started onboarding screen. Disabled when the active
 * account isn't a Mastodon account, so the atproto path doesn't pay
 * anything when the hook is mounted in a shared parent.
 */
export function useMastodonSuggestions(limit: number = 20) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();
  const instanceUrl = currentAccount?.mastodon?.instanceUrl;
  const accountId = currentAccount?.mastodon?.accountId;

  return useQuery<MastodonSuggestion[]>({
    queryKey: queryKeys.mastodonSuggestions.list(instanceUrl, accountId, limit),
    queryFn: async () => {
      if (!instanceUrl || !token) {
        throw new Error('useMastodonSuggestions: missing instance or token.');
      }
      return await fetchMastodonSuggestions({ instanceUrl, accessToken: token, limit });
    },
    enabled: Boolean(instanceUrl && token && currentAccount?.mastodon),
    // Onboarding sees these once — long stale time so a tab-switch doesn't
    // refetch and shuffle the list.
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });
}
