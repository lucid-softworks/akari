import { useQuery } from '@tanstack/react-query';

import { TealApi } from '@/teal-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import type { TealPlayRecord } from '@/teal-api';

export function useProfileNowPlaying(did: string | undefined) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery<TealPlayRecord | null>({
    queryKey: ['profile', 'nowPlaying', did, currentAccount?.pdsUrl],
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!did) throw new Error('No DID provided');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new TealApi(currentAccount.pdsUrl);
      return api.getLatestPlay(token, did);
    },
    enabled: Boolean(did && token && currentAccount?.pdsUrl),
    staleTime: 60 * 1000,
  });
}
