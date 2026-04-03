import { router } from 'expo-router';
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
      // refetching with null tokens and crashing
      queryClient.clear();

      return true;
    },
    onSuccess: () => {
      // Navigate to sign-in immediately
      router.replace('/(auth)/signin');
    },
  });
}
