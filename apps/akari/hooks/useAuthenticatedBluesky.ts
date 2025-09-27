import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useSetAuthentication } from '@/hooks/mutations/useSetAuthentication';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useRefreshToken } from '@/hooks/queries/useRefreshToken';
import type { BlueskyApiClientOptions, BlueskySession } from '@/bluesky-api';

/**
 * Provides Bluesky API client options that supply refresh metadata for automatic retries.
 */
export function useAuthenticatedBluesky(): BlueskyApiClientOptions {
  const { data: refreshToken } = useRefreshToken();
  const { data: currentAccount } = useCurrentAccount();
  const setAuthentication = useSetAuthentication();
  const queryClient = useQueryClient();

  return useMemo<BlueskyApiClientOptions>(() => {
    if (!refreshToken) {
      return {};
    }

    const persistSession = async (session: BlueskySession) => {
      await setAuthentication.mutateAsync({
        token: session.accessJwt,
        refreshToken: session.refreshJwt,
        did: session.did,
        handle: session.handle,
        pdsUrl: currentAccount?.pdsUrl,
      });

      queryClient.invalidateQueries({ queryKey: ['auth', session.did] });
    };

    return {
      getRefreshToken: async () => refreshToken,
      onSessionRefreshed: persistSession,
    } satisfies BlueskyApiClientOptions;
  }, [currentAccount?.pdsUrl, queryClient, refreshToken, setAuthentication]);
}
