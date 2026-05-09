import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type BlueskyLabelersPref, type BlueskyPreference } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

const LABELERS_PREF_TYPE = 'app.bsky.actor.defs#labelersPref';

type Updater = (current: { did: string }[]) => { did: string }[];

/**
 * Edits the user's `labelersPref` (the list of subscribed moderation
 * labelers). Same overwrite-the-whole-list pattern as
 * `useUpdateMutedWords` — we read the current preference array, swap the
 * `labelersPref` slot, and `putPreferences` the merged list.
 */
export function useUpdateLabelersPref() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (updater: Updater) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      const current = await api.getPreferences(token);

      const existing = current.preferences.find(
        (p): p is BlueskyLabelersPref => p.$type === LABELERS_PREF_TYPE,
      );
      const nextLabelers = updater(existing?.labelers ?? []);

      const nextPref: BlueskyLabelersPref = {
        $type: LABELERS_PREF_TYPE,
        labelers: nextLabelers,
      };
      const others = current.preferences.filter(
        (p) => p.$type !== LABELERS_PREF_TYPE,
      );
      const next: BlueskyPreference[] = [...others, nextPref];

      await api.putPreferences(token, next);
      return nextLabelers;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}
