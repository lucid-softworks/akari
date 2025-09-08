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
  });
}
