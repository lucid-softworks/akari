import { storage } from '@/utils/secureStorage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation hook for setting all authentication data at once
 */
export function useSetAuthentication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['setAuthentication'],
    mutationFn: async ({
      token,
      refreshToken,
      did,
      handle,
      pdsUrl,
    }: {
      token: string;
      refreshToken: string;
      did: string;
      handle: string;
      pdsUrl?: string;
    }) => {
      return { token, refreshToken, did, handle, pdsUrl };
    },
    onSuccess: async ({ token, refreshToken, did, handle, pdsUrl }) => {
      queryClient.setQueryData(['jwtToken'], token);
      queryClient.setQueryData(['refreshToken'], refreshToken);

      // Create and set the current account
      const currentAccount = {
        did,
        handle,
        jwtToken: token,
        refreshToken,
        pdsUrl,
      };
      queryClient.setQueryData(['currentAccount'], currentAccount);

      // Manually persist the updated queries
      storage.setItem('jwtToken', token);
      storage.setItem('refreshToken', refreshToken);
      storage.setItem('currentAccount', currentAccount);
    },
  });
}
