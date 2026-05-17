import { useMutation } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { apiForAccount } from '@/utils/blueskyApi';

/**
 * Triggers Bluesky's password-reset email for the given address.
 * Unauthenticated — the PDS keys the email by address, not session.
 */
export function useRequestPasswordReset() {
  const { data: currentAccount } = useCurrentAccount();

  // oxlint-disable-next-line react-doctor/query-mutation-missing-invalidation -- fire-and-forget, no cache derived from this mutation
  return useMutation({
    mutationFn: async (email: string) => {
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');
      const api = apiForAccount(currentAccount);
      await api.requestPasswordReset(email);
    },
  });
}
