import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Calls com.atproto.server.updateEmail. The token is required when
 * `requestEmailUpdate` returned `tokenRequired: true` — the PDS sends
 * it to the existing email address and the user has to copy it into
 * the form.
 */
export function useUpdateEmail() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ email, token: emailToken }: { email: string; token?: string }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      await api.updateEmail(token, email, emailToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.session.all });
    },
  });
}
