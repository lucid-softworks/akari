import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type BlueskyContentLanguagesPref,
  type BlueskyPreference,
} from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

const PREF_TYPE = 'app.bsky.actor.defs#contentLanguagesPref';

type Updater = (current: string[]) => string[];

/**
 * Edits the user's `contentLanguagesPref`. Same overwrite-the-whole-list
 * pattern as useUpdateMutedWords — read prefs, swap the slot, put back.
 */
export function useUpdateContentLanguages() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (updater: Updater): Promise<string[]> => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      const current = await api.getPreferences(token);

      const existing = current.preferences.find(
        (p): p is BlueskyContentLanguagesPref => p.$type === PREF_TYPE,
      );
      const nextLanguages = updater(existing?.languages ?? []);

      const nextPref: BlueskyContentLanguagesPref = {
        $type: PREF_TYPE,
        languages: nextLanguages,
      };
      const others = current.preferences.filter((p) => p.$type !== PREF_TYPE);
      const next: BlueskyPreference[] = [...others, nextPref];

      await api.putPreferences(token, next);
      return nextLanguages;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}
