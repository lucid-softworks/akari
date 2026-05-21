import { useQuery } from '@tanstack/react-query';

import type { BlueskyRecordAuthor } from '@/bluesky-api';
import { apiForPublicAppView } from '@/utils/blueskyApi';

/**
 * Shape returned to consumers: a Set for O(1) membership checks plus
 * the underlying subject views so the thanks modal can render
 * avatars + handles without re-fetching profiles. Both come from the
 * same `getList` page walk.
 */
export type AkariMembersData = {
  dids: Set<string>;
  members: BlueskyRecordAuthor[];
};

/**
 * The curated "akari" list maintained by the project. Members of this
 * list get a small Akari-classic badge rendered next to the
 * verification check on their profile so the community can spot
 * akari users at a glance.
 *
 * The list URI is hard-coded on purpose — this isn't a per-user
 * preference, it's the project's own marker. If the list ever moves
 * we update the constant here and ship a new build.
 */
const AKARI_LIST_URI =
  'at://did:plc:qysnzwcpvbhdp2i7t26t3u65/app.bsky.graph.list/3mmffmdgp3h2o';

/**
 * Page size for `app.bsky.graph.getList`. The endpoint caps at 100;
 * we walk the cursor until exhausted so the membership set is
 * complete regardless of list size.
 */
const PAGE_SIZE = 100;

/**
 * Fetches every member of the curated akari list and returns their
 * DIDs as a `Set` for O(1) lookups. The call goes through the public
 * AppView (no token), so guests get the badge data too.
 *
 * Cached for a full day with no automatic refetch — the list moves
 * slowly enough that a stale read costs nothing, and we don't want
 * to pay the cursor walk on every profile mount.
 *
 * `meta.persist: false` opts the query out of the React Query
 * persisted cache: the persister round-trips through JSON, and
 * `JSON.stringify(new Set([...]))` collapses to `"{}"`, so a
 * persisted entry would rehydrate as a plain object whose `.has` is
 * undefined and `useIsAkariMember` would crash on every profile
 * mount until the 24h refetch landed. Refetching once per cold start
 * is cheap and keeps the in-memory value a real `Set`.
 */
export function useAkariMembers() {
  return useQuery<AkariMembersData>({
    queryKey: ['akariMembers', AKARI_LIST_URI],
    queryFn: async (): Promise<AkariMembersData> => {
      const api = apiForPublicAppView();
      const dids = new Set<string>();
      const members: BlueskyRecordAuthor[] = [];
      let cursor: string | undefined;
      // Cap the walk at 20 pages (2000 DIDs) as a sanity guard so a
      // runaway cursor can't pin the network forever.
      for (let pages = 0; pages < 20; pages++) {
        const response = await api.getList('', AKARI_LIST_URI, PAGE_SIZE, cursor);
        for (const item of response.items ?? []) {
          if (!item.subject?.did) continue;
          if (dids.has(item.subject.did)) continue;
          dids.add(item.subject.did);
          members.push(item.subject);
        }
        cursor = response.cursor;
        if (!cursor) break;
      }
      return { dids, members };
    },
    staleTime: 24 * 60 * 60 * 1000, // 24h
    gcTime: 24 * 60 * 60 * 1000,
    meta: { persist: false },
  });
}

/**
 * Convenience: true when `did` is in the akari members list.
 * Defensive about the shape of `data` — if a stale persisted entry
 * somehow gets through (e.g. a cache-buster bump didn't fire), the
 * `instanceof` guard keeps the call site from throwing.
 */
export function useIsAkariMember(did: string | undefined): boolean {
  const { data } = useAkariMembers();
  if (!did) return false;
  if (!data || !(data.dids instanceof Set)) return false;
  return data.dids.has(did);
}
