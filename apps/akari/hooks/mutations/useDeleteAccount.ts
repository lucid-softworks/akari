import { useMutation } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Two-step destructive flow. Step one (`requestToken`) emails a
 * confirmation token. Step two (`confirm`) sends that token together
 * with the user's password, and the PDS permanently removes the
 * account.
 */
export function useRequestAccountDelete() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      await api.requestAccountDelete(token);
    },
  });
}

export function useDeleteAccount() {
  const { data: currentAccount } = useCurrentAccount();

  return useMutation({
    mutationFn: async ({ password, token: emailToken }: { password: string; token: string }) => {
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      await api.deleteAccount(currentAccount.did, password, emailToken);
    },
  });
}
