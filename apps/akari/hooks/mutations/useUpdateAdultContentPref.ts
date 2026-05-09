import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type BlueskyAdultContentPref,
  type BlueskyPreference,
} from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

const ADULT_CONTENT_PREF_TYPE = 'app.bsky.actor.defs#adultContentPref';

/**
 * Mutation that toggles the adult-content preference on the user's repo.
 *
 * `putPreferences` overwrites the entire preference list, so we read the
 * current set, swap the `adultContentPref` slot, and put the merged list
 * back — same pattern as `useUpdateMutedWords`.
 */
export function useUpdateAdultContentPref() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (enabled: boolean): Promise<boolean> => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      const current = await api.getPreferences(token);

      const nextPref: BlueskyAdultContentPref = {
        $type: ADULT_CONTENT_PREF_TYPE,
        enabled,
      };
      const others = current.preferences.filter(
        (p) => p.$type !== ADULT_CONTENT_PREF_TYPE,
      );
      const next: BlueskyPreference[] = [...others, nextPref];

      await api.putPreferences(token, next);
      return enabled;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}
