import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type BlueskyMutedWord,
  type BlueskyMutedWordsPref,
  type BlueskyPreference,
} from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

const MUTED_WORDS_PREF_TYPE = 'app.bsky.actor.defs#mutedWordsPref';

type Updater = (currentItems: BlueskyMutedWord[]) => BlueskyMutedWord[];

/**
 * Mutation hook for editing the user's muted-words list.
 *
 * Bluesky's `putPreferences` overwrites the entire preference array, so we
 * read the current preferences first, apply the caller-provided updater to
 * just the `mutedWordsPref` slice, merge it back into the full preference
 * list, and put the merged list back.
 */
export function useUpdateMutedWords() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (updater: Updater): Promise<BlueskyMutedWord[]> => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      const current = await api.getPreferences(token);

      const existing = current.preferences.find(
        (p): p is BlueskyMutedWordsPref => p.$type === MUTED_WORDS_PREF_TYPE,
      );
      const nextItems = updater(existing?.items ?? []);

      const nextPref: BlueskyMutedWordsPref = {
        $type: MUTED_WORDS_PREF_TYPE,
        items: nextItems,
      };

      const others = current.preferences.filter(
        (p) => p.$type !== MUTED_WORDS_PREF_TYPE,
      );
      const next: BlueskyPreference[] = [...others, nextPref];

      await api.putPreferences(token, next);
      return nextItems;
    },
    onSuccess: () => {
      // The preferences query is the source of truth for `useMutedWords`;
      // invalidate so any consumer (settings screen, feed filters) sees the
      // change.
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}
