import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';
import { getLiveHost, liveServiceName } from '@/utils/liveStatus';

type SetLiveStatusParams = {
  /** The live link (already validated against the allowed-host set). */
  url: string;
  /** Status duration in minutes. */
  durationMinutes: number;
  /**
   * When editing an existing status, the original record's createdAt so the
   * duration window isn't silently reset. Omit when going live fresh.
   */
  createdAt?: string;
};

/**
 * Publishes or updates the current account's live status
 * (`app.bsky.actor.status`).
 *
 * We don't have an OpenGraph unfurler in the app, so the embed card uses the
 * provider's friendly name as its title and the URL as its description. The
 * AppView re-derives the proper card metadata server-side.
 */
export function useSetLiveStatus() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationKey: ['setLiveStatus'],
    mutationFn: async ({ url, durationMinutes, createdAt }: SetLiveStatusParams) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const host = getLiveHost(url);
      const api = apiForAccount(currentAccount);
      await api.setActorStatus(token, currentAccount.did, {
        durationMinutes,
        createdAt,
        external: {
          uri: url,
          title: host ? liveServiceName(host) : url,
          description: url,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
}
