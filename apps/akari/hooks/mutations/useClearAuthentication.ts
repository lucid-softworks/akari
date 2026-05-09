import { queryKeys } from '@/hooks/queryKeys';
import { storage } from '@/utils/secureStorage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation hook for clearing all authentication data
 */
export function useClearAuthentication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return true;
    },
    onSuccess: async () => {
      queryClient.setQueryData(queryKeys.jwtToken(), null);
      queryClient.setQueryData(queryKeys.refreshToken(), null);

      // Manually persist the cleared authentication queries
      storage.removeItem('jwtToken');
      storage.removeItem('refreshToken');

      // Invalidate all auth-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
    },
  });
}
