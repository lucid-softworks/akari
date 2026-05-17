import { useQuery } from '@tanstack/react-query';

import { type BlueskyLabelerView, type BlueskyLabelersPref } from '@/bluesky-api';
import { getAuthor } from '@/hooks/queries/microcosm';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { SlingshotApi } from '@/slingshot-api';
import { apiForAccount } from '@/utils/blueskyApi';

const slingshot = new SlingshotApi();

/** Bluesky's default moderation labeler — always included so a fresh account
 * still sees a labeler in the picker even before subscribing to anything. */
const BSKY_DEFAULT_LABELER_DID = 'did:plc:ar7c4by46qjdydhdevvrndac';

type LabelerServiceRecord = {
  policies?: BlueskyLabelerView['policies'];
  reasonTypes?: string[];
  subjectTypes?: ('account' | 'record')[];
  createdAt?: string;
};

/**
 * Microcosm-mode hydration: for each labeler DID, fetch the
 * `app.bsky.labeler.service/self` record from slingshot and the creator
 * profile via `getAuthor`. Engagement counts (`likeCount`, `viewer.like`)
 * are AppView-only and stay undefined.
 */
async function microcosmLabelerViews(dids: string[]): Promise<BlueskyLabelerView[]> {
  const views = await Promise.all(
    dids.map(async (did): Promise<BlueskyLabelerView | null> => {
      try {
        const [record, author] = await Promise.all([
          slingshot.getRecord<LabelerServiceRecord>({
            repo: did,
            collection: 'app.bsky.labeler.service',
            rkey: 'self',
          }),
          getAuthor(did),
        ]);
        return {
          uri: record.uri,
          cid: record.cid,
          creator: {
            did: author.did,
            handle: author.handle,
            displayName: author.displayName,
            avatar: author.avatar,
          },
          indexedAt: record.value.createdAt ?? new Date(0).toISOString(),
          policies: record.value.policies,
          reasonTypes: record.value.reasonTypes,
          subjectTypes: record.value.subjectTypes,
        };
      } catch {
        // Labeler hasn't published a service record (or slingshot doesn't
        // have it cached yet). Drop it from the list — better than crashing
        // the report sheet over one missing labeler.
        return null;
      }
    }),
  );
  return views.filter((v): v is BlueskyLabelerView => v !== null);
}

/**
 * Returns labeler service views for every labeler the current user is
 * subscribed to (plus Bluesky's default labeler). Used by the report flow
 * to let the user pick which moderation service to send the report to.
 */
export function useLabelers() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const { data: preferences } = usePreferences();
  const appViewEnabled = useAppViewEnabled();

  const subscribedDids =
    preferences?.preferences.flatMap((p) =>
      p.$type === 'app.bsky.actor.defs#labelersPref'
        ? (p as BlueskyLabelersPref).labelers.map((l) => l.did)
        : [],
    ) ?? [];

  const dids = Array.from(new Set([BSKY_DEFAULT_LABELER_DID, ...subscribedDids]));

  return useQuery<BlueskyLabelerView[]>({
    queryKey: queryKeys.labelers(currentAccount?.pdsUrl, dids.join(','), appViewEnabled),
    enabled: dids.length > 0 && (appViewEnabled ? !!token && !!currentAccount?.pdsUrl : true),
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!appViewEnabled) {
        return microcosmLabelerViews(dids);
      }

      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      const result = await api.getLabelerServices(token, dids);
      return result.views;
    },
  });
}

export { BSKY_DEFAULT_LABELER_DID };
