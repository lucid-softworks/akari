import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type BlueskyPreference,
  type BlueskyThreadViewPref,
} from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import {
  type ThreadPreferences,
} from '@/hooks/queries/useThreadPreferences';
import { apiForAccount } from '@/utils/blueskyApi';

const PREF_TYPE = 'app.bsky.actor.defs#threadViewPref';

export function useUpdateThreadPreferences() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (input: ThreadPreferences) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      const current = await api.getPreferences(token);

      const nextPref: BlueskyThreadViewPref = {
        $type: PREF_TYPE,
        sort: input.sort,
        prioritizeFollowedUsers: input.prioritizeFollowedUsers,
      };
      const others = current.preferences.filter((p) => p.$type !== PREF_TYPE);
      const next: BlueskyPreference[] = [...others, nextPref];

      await api.putPreferences(token, next);
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}
