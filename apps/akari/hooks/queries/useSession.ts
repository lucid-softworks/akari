import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Loads the current session metadata (handle, DID, email,
 * email-confirmation flags). Useful for surfacing the user's email
 * address in account settings — `app.bsky.actor.getProfile` doesn't
 * return it.
 */
export function useSession() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: queryKeys.session.forDid(currentAccount?.did),
    enabled: !!token && !!currentAccount?.pdsUrl,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      return api.getSession(token);
    },
  });
}
