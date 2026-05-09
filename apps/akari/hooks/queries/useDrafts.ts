import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { draftViewToComposerState, type ComposerDraftState } from '@/utils/draftMapper';
import { apiForPdsUrl } from '@/utils/blueskyApi';

/**
 * Loads the current user's composer drafts from the appview's private
 * stash. Sorted newest-first by `updatedAt` so the drafts sheet doesn't
 * have to.
 */
export function useDrafts(enabled: boolean = true) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const did = currentAccount?.did;
  const pdsUrl = currentAccount?.pdsUrl;

  return useQuery<ComposerDraftState[]>({
    queryKey: queryKeys.drafts(did),
    enabled: !!token && !!pdsUrl && !!did && enabled,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!token || !pdsUrl) return [];
      const api = apiForPdsUrl(pdsUrl);
      const res = await api.getDrafts(token, { limit: 100 });
      return res.drafts
        .map(draftViewToComposerState)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
  });
}
