import { storage } from '@/utils/secureStorage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation hook for wiping all accounts, current account, and authentication tokens
 */
export function useWipeAllData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Clear storage first
      storage.removeItem('accounts');
      storage.removeItem('currentAccount');
      storage.removeItem('jwtToken');
      storage.removeItem('refreshToken');

      // Clear query cache entirely to prevent stale queries from
      // refetching with null tokens and crashing. Clearing the cache also
      // invalidates useAuthStatus, so (tabs)/_layout.tsx's built-in
      // <Redirect href="/(auth)/signin"> will fire on the next render and
      // route the user back to the auth flow without an imperative call.
      queryClient.clear();

      return true;
    },
  });
}
