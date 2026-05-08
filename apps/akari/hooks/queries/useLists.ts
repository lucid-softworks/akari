import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { type BlueskyListResponse, type BlueskyListsResponse } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Lists owned by the given actor (defaults to the current user).
 */
export function useLists(actor?: string) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const target = actor ?? currentAccount?.did ?? '';

  return useInfiniteQuery<BlueskyListsResponse>({
    queryKey: ['lists', currentAccount?.pdsUrl, target] as const,
    enabled: !!token && !!currentAccount?.pdsUrl && !!target,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!target) throw new Error('No actor');

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
    queryKey: ['list', currentAccount?.pdsUrl, listUri] as const,
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

