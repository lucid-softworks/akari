import { useQuery } from '@tanstack/react-query';
import { getClaimsForHandle, type ClaimVerificationResult } from '@keytrace/claims';

export type { ClaimVerificationResult };

export function useKeytraceClaims(handle?: string) {
  return useQuery({
    queryKey: ['keytrace', handle],
    queryFn: async () => {
      const result = await getClaimsForHandle(handle!);
      return result.claims.filter((c) => c.verified);
    },
    enabled: !!handle,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}
