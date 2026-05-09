import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/** Lists the current user's app passwords (name + creation timestamp). */
export function useAppPasswords() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery({
    queryKey: queryKeys.appPasswords.forDid(currentAccount?.did),
    enabled: !!token && !!currentAccount?.pdsUrl,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      const res = await api.listAppPasswords(token);
      return res.passwords;
    },
  });
}
