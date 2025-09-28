import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

export type UpdateListMembershipVariables = {
  did: string;
  listUri: string;
  action: 'add' | 'remove';
  listItemUri?: string;
};

export function useUpdateListMembership() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationKey: ['updateListMembership'],
    mutationFn: async ({ did, listUri, action, listItemUri }: UpdateListMembershipVariables) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl);

      if (action === 'add') {
        return await api.createListItem(token, listUri, did);
      }

      if (!listItemUri) {
        throw new Error('List item URI is required for removal');
      }

      return await api.deleteListItem(token, listItemUri);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', variables.did] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['listMemberships', variables.did] });

      if (currentAccount?.did) {
        queryClient.invalidateQueries({ queryKey: ['viewerLists', currentAccount.did] });
      }
    },
  });
}
