import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { readAppViewEnabled } from '@/hooks/useAppViewSettings';
import { useQuery } from '@tanstack/react-query';
import { AppViewRequiredError } from '@/utils/appView';
import { apiForAccount } from '@/utils/blueskyApi';
/**
 * Query hook for fetching the user's timeline feed
 * @param limit - Number of posts to fetch (default: 20)
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useTimeline(limit: number = 20, enabled: boolean = true) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const currentUserDid = currentAccount?.did;
  const appViewEnabled = useAppViewEnabled();

  return useQuery({
    queryKey: queryKeys.timeline.list(limit, currentUserDid, appViewEnabled),
    queryFn: async () => {
      if (!readAppViewEnabled()) throw new AppViewRequiredError('timeline');
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      return await api.getTimeline(token, limit);
    },
    enabled: enabled && !!token && !!currentUserDid,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
