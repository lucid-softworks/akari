import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Creates a new app password. The returned `password` is the plaintext
 * value the user should copy — atproto only returns it once.
 */
export function useCreateAppPassword() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ name, privileged }: { name: string; privileged?: boolean }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      return api.createAppPassword(token, name, privileged ?? false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appPasswords.all });
    },
  });
}
