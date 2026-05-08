import { useQuery } from '@tanstack/react-query';

import type { AiPreferencesRecord } from '@/bluesky-api';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Reads the active account's `community.lexicon.preference.ai` record.
 * Returns `null` for accounts that haven't set one yet — the settings
 * screen treats that as "use sensible defaults" and only POSTs once the
 * user toggles something.
 */
export function useAiPreferences() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useQuery<AiPreferencesRecord | null>({
    queryKey: ['aiPreferences', currentAccount?.did, currentAccount?.pdsUrl] as const,
    queryFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      if (!currentAccount?.did) throw new Error('No DID available');
      const api = apiForAccount(currentAccount);
      return await api.getAiPreferences(token, currentAccount.did);
    },
    enabled: !!token && !!currentAccount?.pdsUrl && !!currentAccount?.did,
    staleTime: 5 * 60 * 1000,
  });
}
