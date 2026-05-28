import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  BlueskyPreference,
  BlueskySavedFeedItem,
  BlueskySavedFeedsPref,
} from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

const PREF_TYPE = 'app.bsky.actor.defs#savedFeedsPrefV2';

type Updater = (current: BlueskySavedFeedItem[]) => BlueskySavedFeedItem[];

/**
 * Rewrites the user's `savedFeedsPrefV2` list. Pass a pure updater
 * that takes the current saved feeds and returns the new ordering /
 * pin state / membership.
 */
export function useUpdateSavedFeeds() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (updater: Updater): Promise<BlueskySavedFeedItem[]> => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      const current = await api.getPreferences(token);

      const existing = current.preferences.find(
        (p): p is BlueskySavedFeedsPref => p.$type === PREF_TYPE,
      );
      const nextItems = updater(existing?.items ?? []);

      const nextPref: BlueskySavedFeedsPref = { $type: PREF_TYPE, items: nextItems };
      const others = current.preferences.filter((p) => p.$type !== PREF_TYPE);
      const next: BlueskyPreference[] = [...others, nextPref];

      await api.putPreferences(token, next);
      return nextItems;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}
