import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Personalised "who to follow" suggestions. Hits the authenticated PDS,
 * which proxies to the AppView — so requires both a signed-in account
 * and a current JWT.
 */
export function useSuggestedFollows(limit: number = 5, enabled: boolean = true) {
  const { data: currentAccount } = useCurrentAccount();
  const { data: token } = useJwtToken();

  return useQuery({
    queryKey: queryKeys.suggestedFollows(limit, currentAccount?.did),
    staleTime: 10 * 60 * 1000,
    enabled: enabled && !!currentAccount?.pdsUrl && !!token,
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      const res = await api.getSuggestions(token, { limit });
      return res.actors;
    },
  });
}
