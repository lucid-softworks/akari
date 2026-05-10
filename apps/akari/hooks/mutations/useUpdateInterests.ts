import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type BlueskyInterestsPref,
  type BlueskyPreference,
} from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

const PREF_TYPE = 'app.bsky.actor.defs#interestsPref';

type Updater = (current: string[]) => string[];

export function useUpdateInterests() {
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
        (p): p is BlueskyInterestsPref => p.$type === PREF_TYPE,
      );
      const nextTags = updater(existing?.tags ?? []);

      const nextPref: BlueskyInterestsPref = {
        $type: PREF_TYPE,
        tags: nextTags,
      };
      const others = current.preferences.filter((p) => p.$type !== PREF_TYPE);
      const next: BlueskyPreference[] = [...others, nextPref];

      await api.putPreferences(token, next);
      return nextTags;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}
