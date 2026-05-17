import { useQuery } from '@tanstack/react-query';

import { type BlueskyNotificationPreferences } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { readAppViewEnabled } from '@/hooks/useAppViewSettings';
import { AppViewRequiredError } from '@/utils/appView';
import { apiForAccount } from '@/utils/blueskyApi';

/** Per-category notification preferences for the current user. */
export function useNotificationPreferences() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();

  return useQuery<BlueskyNotificationPreferences>({
    queryKey: queryKeys.notifications.preferences(currentAccount?.did, appViewEnabled),
    enabled: !!token && !!currentAccount?.pdsUrl,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!readAppViewEnabled()) throw new AppViewRequiredError('notifications');
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      return api.getNotificationPreferences(token);
    },
  });
}
