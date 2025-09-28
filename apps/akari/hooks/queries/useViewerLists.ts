import { useQuery } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

export function useViewerLists() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: ['viewerLists', currentAccount?.did, currentAccount?.pdsUrl],
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!currentAccount?.did) throw new Error('No DID available');

      const api = new BlueskyApi(currentAccount.pdsUrl);
      return await api.getLists(token, currentAccount.did);
    },
    enabled: Boolean(token && currentAccount?.did && currentAccount?.pdsUrl),
    staleTime: 5 * 60 * 1000,
  });
}
