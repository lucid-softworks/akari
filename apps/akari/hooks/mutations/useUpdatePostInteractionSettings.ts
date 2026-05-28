import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type BlueskyPostInteractionSettingsPref,
  type BlueskyPreference,
} from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import {
  type DerivedPostInteractionSettings,
} from '@/hooks/queries/usePostInteractionSettings';
import { apiForAccount } from '@/utils/blueskyApi';

const PREF_TYPE = 'app.bsky.actor.defs#postInteractionSettingsPref';

/**
 * Encodes the form state from the Interaction Settings screen into the
 * lexicon shape and writes it to `postInteractionSettingsPref`. The pref
 * controls the defaults applied when the user composes a new post; it
 * does not retroactively change existing posts (that's threadgate /
 * postgate territory).
 */
export function useUpdatePostInteractionSettings() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (input: DerivedPostInteractionSettings) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      const current = await api.getPreferences(token);

      const allowRules: { $type: string; list?: string }[] | undefined = (() => {
        if (input.mode === 'nobody') return [];
        const rules: { $type: string; list?: string }[] = [];
        if (input.followers) rules.push({ $type: 'app.bsky.feed.threadgate#followerRule' });
        if (input.following) rules.push({ $type: 'app.bsky.feed.threadgate#followingRule' });
        if (input.mentioned) rules.push({ $type: 'app.bsky.feed.threadgate#mentionRule' });
        for (const list of input.allowedLists) {
          rules.push({ $type: 'app.bsky.feed.threadgate#listRule', list });
        }
        return rules.length ? rules : undefined;
      })();

      const postgateEmbeddingRules = input.allowQuotes
        ? undefined
        : [{ $type: 'app.bsky.feed.postgate#disableRule' }];

      const nextPref: BlueskyPostInteractionSettingsPref = {
        $type: PREF_TYPE,
        ...(allowRules !== undefined ? { threadgateAllowRules: allowRules } : {}),
        ...(postgateEmbeddingRules ? { postgateEmbeddingRules } : {}),
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
