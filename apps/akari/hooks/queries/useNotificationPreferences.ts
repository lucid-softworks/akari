import { useQuery } from '@tanstack/react-query';

import { type BlueskyNotificationPreferences } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/** Per-category notification preferences for the current user. */
export function useNotificationPreferences() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery<BlueskyNotificationPreferences>({
    queryKey: queryKeys.notifications.preferences(currentAccount?.did),
    enabled: !!token && !!currentAccount?.pdsUrl,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      return api.getNotificationPreferences(token);
    },
  });
}
