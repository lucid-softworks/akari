import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type BlueskyNotificationPreferences } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

type Patch = Partial<BlueskyNotificationPreferences>;

/**
 * Patches one or more category preferences via
 * `app.bsky.notification.putPreferencesV2`. The v2 endpoint merges with
 * existing values rather than overwriting, so callers only need to send
 * the categories they're changing.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (patch: Patch): Promise<Patch> => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      await api.putNotificationPreferencesV2(token, patch);
      return patch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences(currentAccount?.did) });
    },
  });
}
