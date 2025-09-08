import { storage } from '@/utils/secureStorage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation hook for setting JWT tokens
 */
export function useSetJwtToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      return token;
    },
    onSuccess: async (token) => {
      queryClient.setQueryData(['jwtToken'], token);

      // Manually persist the updated JWT token query
      storage.setItem('jwtToken', token);
    },
  });
}
