import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { BlueskyApi } from '@/bluesky-api';
import { useAuthenticatedBluesky } from '@/hooks/useAuthenticatedBluesky';

/**
 * Mutation hook for blocking and unblocking users
 */
type BlockUserParams = {
  /** The user's DID */
  did: string;
  /** The block URI (required for unblock) */
  blockUri?: string;
  /** Whether to block or unblock */
  action: 'block' | 'unblock';
};

export function useBlockUser() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const apiOptions = useAuthenticatedBluesky();

  return useMutation({
    mutationKey: ['blockUser'],
    mutationFn: async ({ did, blockUri, action }: BlockUserParams) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl, apiOptions);

      if (action === 'block') {
        return await api.blockUser(token, did);
      } else {
        if (!blockUri) throw new Error('Block URI is required for unblock');
        return await api.unblockUser(token, blockUri);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate profile queries to refresh block status
      queryClient.invalidateQueries({ queryKey: ['profile', variables.did] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
