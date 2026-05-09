import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/** Revokes an existing app password by its display name. */
export function useRevokeAppPassword() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      await api.revokeAppPassword(token, name);
      return name;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appPasswords.all });
    },
  });
}
