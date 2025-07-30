import { storage } from '@/utils/secureStorage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Mutation hook for wiping all accounts, current account, and authentication tokens
 */
export function useWipeAllData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return true;
    },
    onSuccess: async () => {
      // Clear all accounts
      queryClient.setQueryData(['accounts'], []);

      // Clear current account
      queryClient.setQueryData(['currentAccount'], null);

      // Clear authentication tokens
      queryClient.setQueryData(['jwtToken'], null);
      queryClient.setQueryData(['refreshToken'], null);

      // Manually persist the cleared data
      storage.removeItem('accounts');
      storage.removeItem('currentAccount');
      storage.removeItem('jwtToken');
      storage.removeItem('refreshToken');

      // Invalidate all related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['currentAccount'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['jwtToken'] });
      queryClient.invalidateQueries({ queryKey: ['refreshToken'] });
    },
  });
}
