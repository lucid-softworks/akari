import { useQuery } from '@tanstack/react-query';
import { getClaimsForHandle } from '@keytrace/claims';

export function useKeytraceClaims(handle?: string) {
  return useQuery({
    queryKey: ['keytrace', handle],
    queryFn: () => getClaimsForHandle(handle!),
    enabled: !!handle,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
}
