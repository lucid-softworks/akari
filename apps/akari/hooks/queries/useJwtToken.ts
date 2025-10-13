import { storage } from '@/utils/secureStorage';
import { useQuery } from '@tanstack/react-query';

/**
 * Query hook for JWT tokens
 * Provides access to the current JWT token
 */
export function useJwtToken() {
  return useQuery({
    queryKey: ['jwtToken'],
    queryFn: () => {
      return storage.getItem('jwtToken');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
