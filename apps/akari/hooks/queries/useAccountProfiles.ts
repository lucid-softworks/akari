import { useQuery } from '@tanstack/react-query';

import { getProfileView } from '@/hooks/queries/microcosm';
import { useAccounts } from './useAccounts';
import { useJwtToken } from './useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Hook to fetch profile data for all accounts (for account switcher UI)
 */
export function useAccountProfiles() {
  const { data: accounts } = useAccounts();
  const { data: token } = useJwtToken();
  const appViewEnabled = useAppViewEnabled();

  return useQuery({
    queryKey: queryKeys.accountProfiles(accounts?.map((a) => a.did), appViewEnabled),
    queryFn: async () => {
      if (!accounts || accounts.length === 0) return {};

      const profiles: Record<string, any> = {};

      // Each account hits its own PDS — fetch concurrently rather than serially.
      const fetched = await Promise.all(
        accounts.map(async (account) => {
          try {
            if (!account.pdsUrl) {
              console.warn(`No PDS URL for account ${account.handle}, skipping profile fetch`);
              return null;
            }
            if (!appViewEnabled) {
              const profile = await getProfileView(account.handle);
              return ([account.did, profile] as const);
            }
            const api = apiForAccount(account);
            const profile = await api.getProfile(account.jwtToken, account.handle);
            return profile ? ([account.did, profile] as const) : null;
          } catch (error) {
            console.error(`Error fetching profile for ${account.handle}:`, error);
            return null;
          }
        }),
      );

      for (const entry of fetched) {
        if (entry) profiles[entry[0]] = entry[1];
      }

      return profiles;
    },
    enabled: !!accounts && accounts.length > 0 && (appViewEnabled ? !!token : true),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
