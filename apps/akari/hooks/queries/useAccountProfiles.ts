import { BlueskyApi, type BlueskyProfileResponse, type BlueskySession } from '@/bluesky-api';
import { useQuery } from '@tanstack/react-query';

import { useAccounts } from './useAccounts';
import { useJwtToken } from './useJwtToken';

/**
 * Hook to fetch profile data for all accounts (for account switcher UI)
 */
export function useAccountProfiles() {
  const { data: accounts } = useAccounts();
  const { data: token } = useJwtToken();

  return useQuery({
    queryKey: ['accountProfiles', accounts?.map((a) => a.did)],
    queryFn: async () => {
      if (!accounts || accounts.length === 0) {
        return {} as Record<string, BlueskyProfileResponse>;
      }

      const profiles: Record<string, BlueskyProfileResponse> = {};

      for (const account of accounts) {
        try {
          // For other accounts, fetch profile data using their PDS
          if (!account.pdsUrl) {
            console.warn(`No PDS URL for account ${account.handle}, skipping profile fetch`);
            continue;
          }
          const session: BlueskySession =
            account.active === false
              ? {
                  handle: account.handle,
                  did: account.did,
                  accessJwt: account.jwtToken,
                  refreshJwt: account.refreshToken,
                  active: false,
                  status: account.status ?? 'deactivated',
                  email: account.email,
                  emailConfirmed: account.emailConfirmed,
                  emailAuthFactor: account.emailAuthFactor,
                }
              : {
                  handle: account.handle,
                  did: account.did,
                  accessJwt: account.jwtToken,
                  refreshJwt: account.refreshToken,
                  active: true,
                  email: account.email,
                  emailConfirmed: account.emailConfirmed,
                  emailAuthFactor: account.emailAuthFactor,
                };
          const api = new BlueskyApi(account.pdsUrl);
          api.setSession(session);
          const profile = await api.getProfile(account.did);

          if (profile) {
            profiles[account.did] = profile;
          }
        } catch (error) {
          console.error(`Error fetching profile for ${account.handle}:`, error);
        }
      }

      return profiles;
    },
    enabled: !!accounts && accounts.length > 0 && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
