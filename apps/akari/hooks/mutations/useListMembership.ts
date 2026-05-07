import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { apiForAccount } from '@/utils/blueskyApi';

type AddArgs = {
  action: 'add';
  listUri: string;
  subjectDid: string;
};

type RemoveArgs = {
  action: 'remove';
  listItemUri: string;
  /** Pass through so we can invalidate the right list snapshot on success. */
  listUri: string;
};

export type ListMembershipArgs = AddArgs | RemoveArgs;

/**
 * Adds or removes a profile from one of the current user's lists.
 *
 * Membership is stored as `app.bsky.graph.listitem` records — one per
 * (list, subject) pair. Add = create a listitem; remove = delete it by URI.
 */
export function useListMembership() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (args: ListMembershipArgs) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      if (args.action === 'add') {
        return api.addToList(token, currentAccount.did, args.listUri, args.subjectDid);
      }
      return api.removeFromList(token, args.listItemUri);
    },
    onSuccess: (_data, args) => {
      // Force a refetch of the list snapshot so the membership state updates.
      queryClient.invalidateQueries({ queryKey: ['listSnapshot', currentAccount?.pdsUrl, args.listUri] });
      queryClient.invalidateQueries({ queryKey: ['list', currentAccount?.pdsUrl, args.listUri] });
    },
  });
}
