import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { BlueskyFeedViewPref, BlueskyPreference } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

const PREF_TYPE = 'app.bsky.actor.defs#feedViewPref';

type Patch = Partial<Omit<BlueskyFeedViewPref, '$type' | 'feed'>>;

/**
 * Updates the user's per-feed view preferences (hide replies / reposts /
 * quote posts). atproto keys these by feed URI; the Following timeline
 * uses the literal value `'home'`. Pass a patch and we'll merge it onto
 * any existing entry for that feed, or insert a new one.
 */
export function useUpdateFeedViewPref() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ feed, patch }: { feed: string; patch: Patch }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      const current = await api.getPreferences(token);

      const existing = current.preferences.find(
        (p): p is BlueskyFeedViewPref => p.$type === PREF_TYPE && p.feed === feed,
      );
      const nextEntry: BlueskyFeedViewPref = {
        $type: PREF_TYPE,
        feed,
        ...existing,
        ...patch,
      };

      const others = current.preferences.filter(
        (p) => !(p.$type === PREF_TYPE && p.feed === feed),
      );
      const next: BlueskyPreference[] = [...others, nextEntry];

      await api.putPreferences(token, next);
      return nextEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}
