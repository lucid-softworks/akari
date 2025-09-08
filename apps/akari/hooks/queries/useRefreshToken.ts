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
  });
}
