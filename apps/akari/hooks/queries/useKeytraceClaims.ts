import { useQuery } from '@tanstack/react-query';
import { getClaimsForHandle } from '@keytrace/claims';

import { queryKeys } from '@/hooks/queryKeys';

export function useKeytraceClaims(handle?: string) {
  return useQuery({
    queryKey: queryKeys.keytrace(handle),
    queryFn: () => getClaimsForHandle(handle!),
    enabled: !!handle,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    select: (result) => result.claims,
  });
}
