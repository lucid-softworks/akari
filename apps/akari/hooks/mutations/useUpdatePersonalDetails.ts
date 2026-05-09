import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type BlueskyPersonalDetailsPref,
  type BlueskyPreference,
} from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

const PERSONAL_DETAILS_PREF_TYPE = 'app.bsky.actor.defs#personalDetailsPref';

/**
 * Round-trips `personalDetailsPref` (just `birthDate` for now) through
 * the user's preference list. Same overwrite-the-whole-list pattern as
 * `useUpdateMutedWords`.
 */
export function useUpdatePersonalDetails() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ birthDate }: { birthDate?: string }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      const current = await api.getPreferences(token);

      const nextPref: BlueskyPersonalDetailsPref = {
        $type: PERSONAL_DETAILS_PREF_TYPE,
        ...(birthDate ? { birthDate } : {}),
      };
      const others = current.preferences.filter(
        (p) => p.$type !== PERSONAL_DETAILS_PREF_TYPE,
      );
      const next: BlueskyPreference[] = [...others, nextPref];
      await api.putPreferences(token, next);
      return birthDate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}
