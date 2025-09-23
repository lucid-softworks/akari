import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BlueskyApi } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';

type MuteAccountVariables = {
  /** The DID or handle of the actor to mute */
  actor: string;
  /** Whether to mute or unmute the actor */
  action: 'mute' | 'unmute';
};

/**
 * Mutation hook for muting and unmuting accounts
 */
export function useMuteAccount() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationKey: ['muteAccount'],
    mutationFn: async ({ actor, action }: MuteAccountVariables) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = new BlueskyApi(currentAccount.pdsUrl);

      if (action === 'mute') {
        return await api.muteUser(token, actor);
      }

      return await api.unmuteUser(token, actor);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', variables.actor] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
