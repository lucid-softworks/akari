import { storage } from '@/utils/secureStorage';
import { useQuery } from '@tanstack/react-query';

/**
 * Query hook for refresh tokens
 * Provides access to the current refresh token
 */
export function useRefreshToken() {
  return useQuery({
    queryKey: ['refreshToken'],
    queryFn: () => {
      return storage.getItem('refreshToken');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
