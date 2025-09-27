import { BlueskyApi } from '@/bluesky-api';
import { useQuery } from '@tanstack/react-query';
import { useAccounts } from './useAccounts';
import { useJwtToken } from './useJwtToken';
import { useCurrentAccount } from './useCurrentAccount';
import { useAuthenticatedBluesky } from '@/hooks/useAuthenticatedBluesky';

/**
 * Hook to fetch profile data for all accounts (for account switcher UI)
 */
export function useAccountProfiles() {
  const { data: accounts } = useAccounts();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const apiOptions = useAuthenticatedBluesky();

  return useQuery({
    queryKey: ['accountProfiles', accounts?.map((a) => a.did)],
    queryFn: async () => {
      if (!accounts || accounts.length === 0) return {};

      const profiles: Record<string, any> = {};

      for (const account of accounts) {
        try {
          // For other accounts, fetch profile data using their PDS
          if (!account.pdsUrl) {
            console.warn(`No PDS URL for account ${account.handle}, skipping profile fetch`);
            continue;
          }
          const isCurrentAccount = account.did === currentAccount?.did;
          const api = new BlueskyApi(account.pdsUrl, isCurrentAccount ? apiOptions : {});
          const profile = await api.getProfile(account.jwtToken, account.handle);

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
