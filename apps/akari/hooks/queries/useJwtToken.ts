import { storage } from '@/utils/secureStorage';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/queryKeys';

/**
 * Query hook for JWT tokens
 * Provides access to the current JWT token
 */
export function useJwtToken() {
  return useQuery({
    queryKey: queryKeys.jwtToken(),
    queryFn: () => {
      return storage.getItem('jwtToken');
    },
    initialData: () => storage.getItem('jwtToken') ?? undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
