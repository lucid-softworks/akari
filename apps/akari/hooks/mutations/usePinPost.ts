import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { apiForAccount } from '@/utils/blueskyApi';

type PinPostArgs = {
  action: 'pin';
  uri: string;
  cid: string;
};

type UnpinPostArgs = {
  action: 'unpin';
};

export type PinPostMutationArgs = PinPostArgs | UnpinPostArgs;

/**
 * Pins or unpins a post on the current user's profile by updating the
 * `app.bsky.actor.profile` record's `pinnedPost` field.
 */
export function usePinPost() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (args: PinPostMutationArgs) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      const pinned = args.action === 'pin' ? { uri: args.uri, cid: args.cid } : null;
      return api.setPinnedPost(token, currentAccount.did, pinned);
    },
    onSuccess: () => {
      // Refetch the profile so the new pinnedPost ref is reflected and
      // PostsTab pulls in the (un)pinned post.
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['pinnedPost'] });
    },
  });
}
