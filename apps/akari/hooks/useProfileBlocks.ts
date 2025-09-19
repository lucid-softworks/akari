import { useQuery } from '@tanstack/react-query';

import { ClearSkyApi } from '@/clearsky-api';

type ProfileBlocks = {
  blocking: number;
  blocked: number;
};

/**
 * Query hook for fetching ClearSky block totals for a user
 */
export function useProfileBlocks(identifier: string | undefined) {
  return useQuery({
    queryKey: ['profileBlocks', identifier],
    queryFn: async (): Promise<ProfileBlocks> => {
      if (!identifier) throw new Error('No identifier provided');

      const api = new ClearSkyApi();
      const [blocking, blocked] = await Promise.all([
        api.getBlocklistTotal(identifier),
        api.getSingleBlocklistTotal(identifier),
      ]);

      return {
        blocking: blocking.data.count,
        blocked: blocked.data.count,
      };
    },
    enabled: !!identifier,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
