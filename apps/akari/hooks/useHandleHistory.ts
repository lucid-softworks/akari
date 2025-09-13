import { ClearSkyApi } from '@/clearsky-api';
import { useQuery } from '@tanstack/react-query';

type HandleHistoryEntry = {
  handle: string;
  changedAt: string; // ISO timestamp
  pds: string;
};

/**
 * Query hook for fetching handle history for a user using ClearSky API
 */
export function useHandleHistory(identifier: string | undefined) {
  return useQuery({
    queryKey: ['handleHistory', identifier],
    queryFn: async (): Promise<HandleHistoryEntry[]> => {
      if (!identifier) throw new Error('No identifier provided');

      const api = new ClearSkyApi();
      const response = await api.getHandleHistory(identifier);

      // Transform ClearSky response to our format
      return response.data.handle_history.map((entry: [string, string, string]) => {
        // ClearSky returns [handle, timestamp, pds] as a tuple
        const [handle, timestamp, pds] = entry;
        return {
          handle,
          changedAt: timestamp,
          pds,
        };
      });
    },
    enabled: !!identifier,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
