import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';
/**
 * Mutation hook for following and unfollowing users
 */
export function useFollowUser() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationKey: ['followUser'],
    mutationFn: async ({
      did,
      followUri,
      action,
    }: {
      /** The user's DID */
      did: string;
      /** The follow URI (required for unfollow) */
      followUri?: string;
      /** Whether to follow or unfollow */
      action: 'follow' | 'unfollow';
    }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!currentAccount?.did) throw new Error('No user DID available');

      const api = apiForAccount(currentAccount);

      if (action === 'follow') {
        return await api.followUser(token, currentAccount.did, did);
      } else {
        if (!followUri) throw new Error('Follow URI is required for unfollow');
        return await api.unfollowUser(token, followUri);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate profile queries to refresh follow status
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.forDid(variables.did) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
}
