import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

type CreateListArgs = {
  name: string;
  description?: string;
  /** Defaults to a curate list — change to `app.bsky.graph.defs#modlist` for
   *  a mute/block list. */
  purpose?: string;
};

const CURATE_LIST_PURPOSE = 'app.bsky.graph.defs#curatelist';

/**
 * Creates a new `app.bsky.graph.list` record under the current user. Used
 * by the list picker sheet to spin up a fresh list inline so the user can
 * add the profile they're viewing without leaving the flow.
 */
export function useCreateList() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ name, description, purpose = CURATE_LIST_PURPOSE }: CreateListArgs) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      return api.createList(token, currentAccount.did, { name, description, purpose });
    },
    onSuccess: () => {
      // Force the lists query to refetch so the new list shows up immediately.
      queryClient.invalidateQueries({ queryKey: queryKeys.lists(currentAccount?.pdsUrl, currentAccount?.did) });
    },
  });
}
