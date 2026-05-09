import { useQuery } from '@tanstack/react-query';

import type { BlueskyListView } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

export type ModerationListSubscription = {
  list: BlueskyListView;
  /** True if the user is muting this list's members. */
  muted: boolean;
  /** AT URI of the `app.bsky.graph.listblock` record, when blocking this list. */
  blockedUri?: string;
};

/**
 * Combined view of moderation list subscriptions: every list the user has
 * either muted (server-side, via muteActorList) or blocked (via a listblock
 * record). A single list can be both — Bluesky shows them deduped.
 */
export function useModerationLists() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery<ModerationListSubscription[]>({
    queryKey: queryKeys.moderationLists.forDid(currentAccount?.did),
    enabled: !!token && !!currentAccount?.pdsUrl,
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);

      const [mutesRes, blocksRes] = await Promise.all([
        api.getListMutes(token, 50),
        api.getListBlocks(token, 50),
      ]);

      // Dedupe by list URI; a list may appear in both responses.
      const byUri = new Map<string, ModerationListSubscription>();
      for (const list of mutesRes.lists ?? []) {
        byUri.set(list.uri, { list, muted: true });
      }
      for (const list of blocksRes.lists ?? []) {
        const existing = byUri.get(list.uri);
        // The list view's `viewer.blocked` is the listblock record URI when
        // the viewer subscribes-as-block. Rely on that to identify the
        // record we'd need to delete on unsubscribe.
        const blockedUri = list.viewer?.blocked;
        if (existing) {
          existing.blockedUri = blockedUri ?? existing.blockedUri;
        } else {
          byUri.set(list.uri, { list, muted: false, blockedUri });
        }
      }
      return Array.from(byUri.values());
    },
  });
}
