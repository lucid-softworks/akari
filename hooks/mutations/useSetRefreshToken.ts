import { storage } from '@/utils/secureStorage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation hook for setting refresh tokens
 */
export function useSetRefreshToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      return token;
    },
    onSuccess: async (token) => {
      queryClient.setQueryData(['refreshToken'], token);

      // Manually persist the updated refresh token query
      storage.setItem('refreshToken', token);
    },
  });
}
