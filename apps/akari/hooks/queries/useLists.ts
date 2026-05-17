import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { type BlueskyListResponse, type BlueskyListsResponse } from '@/bluesky-api';
import { getActorListsPage, resolveIdentifierToDid, resolvePdsUrl } from '@/hooks/queries/microcosm';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Lists owned by the given actor (defaults to the current user).
 */
export function useLists(actor?: string) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const appViewEnabled = useAppViewEnabled();
  const target = actor ?? currentAccount?.did ?? '';

  return useInfiniteQuery<BlueskyListsResponse>({
    queryKey: queryKeys.lists(currentAccount?.pdsUrl, target, appViewEnabled),
    enabled: !!target && (appViewEnabled ? !!token && !!currentAccount?.pdsUrl : true),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      if (!target) throw new Error('No actor');

      if (!appViewEnabled) {
        const did = await resolveIdentifierToDid(target);
        // For the current user we already know their PDS; for everyone
        // else go through the DID document.
        const pdsUrl =
          currentAccount?.did === did ? currentAccount?.pdsUrl : await resolvePdsUrl(did);
        if (!pdsUrl) throw new Error(`Couldn't resolve PDS URL for ${did}`);
        return getActorListsPage({ did, pdsUrl, limit: 50, cursor: pageParam as string | undefined });
      }

      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      return api.getLists(token, target, 50, pageParam as string | undefined);
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  });
}

/**
 * Members of a single list, paginated.
 */
function useList(listUri?: string) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useInfiniteQuery<BlueskyListResponse>({
    queryKey: queryKeys.list(currentAccount?.pdsUrl, listUri),
    enabled: !!token && !!currentAccount?.pdsUrl && !!listUri,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!listUri) throw new Error('No list URI');

      const api = apiForAccount(currentAccount);
      return api.getList(token, listUri, 50, pageParam as string | undefined);
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  });
}

/**
 * Returns whether `subjectDid` is a member of the given list, and the
 * underlying listitem URI (needed to remove the membership).
 *
 * Walks the entire list — auto-fetches pages until the subject is found
 * or the list is exhausted. Slower for huge lists but always correct.
 */
export function useListMembership(listUri: string | undefined, subjectDid: string | undefined) {
  const query = useList(listUri);

  // Once we have the first page back, walk pages until either we find the
  // subject or there are no more pages. React Query gives us a stable
  // `fetchNextPage` reference, so this is safe to depend on.
  const allItems = query.data?.pages.flatMap((p) => p.items) ?? [];
  const found = subjectDid ? allItems.find((i) => i.subject.did === subjectDid) : undefined;

  useEffect(() => {
    if (!subjectDid || found) return;
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [subjectDid, found, query]);

  const stillScanning = !found && (query.isLoading || query.isFetchingNextPage || query.hasNextPage);

  return {
    isMember: !!found,
    listItemUri: found?.uri,
    isLoading: stillScanning,
  };
}

