import { useQuery } from '@tanstack/react-query';

import { type BlueskyLabelerView, type BlueskyLabelersPref } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { apiForAccount } from '@/utils/blueskyApi';

/** Bluesky's default moderation labeler — always included so a fresh account
 * still sees a labeler in the picker even before subscribing to anything. */
const BSKY_DEFAULT_LABELER_DID = 'did:plc:ar7c4by46qjdydhdevvrndac';

/**
 * Returns labeler service views for every labeler the current user is
 * subscribed to (plus Bluesky's default labeler). Used by the report flow
 * to let the user pick which moderation service to send the report to.
 */
export function useLabelers() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const { data: preferences } = usePreferences();

  const subscribedDids =
    preferences?.preferences
      .filter((p): p is BlueskyLabelersPref => p.$type === 'app.bsky.actor.defs#labelersPref')
      .flatMap((p) => p.labelers.map((l) => l.did)) ?? [];

  const dids = Array.from(new Set([BSKY_DEFAULT_LABELER_DID, ...subscribedDids]));

  return useQuery<BlueskyLabelerView[]>({
    queryKey: ['labelers', currentAccount?.pdsUrl, dids.join(',')],
    enabled: !!token && !!currentAccount?.pdsUrl && dids.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      const result = await api.getLabelerServices(token, dids);
      return result.views;
    },
  });
}

export { BSKY_DEFAULT_LABELER_DID };
