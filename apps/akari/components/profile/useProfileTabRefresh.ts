import { useCallback } from 'react';

/**
 * Compose pull-to-refresh for a profile tab. Always refetches the tab's own
 * data; if the parent provides onProfileRefresh, refreshes profile metadata
 * (banner, name, counts) in parallel.
 */
export function useProfileTabRefresh(
  refetch: () => Promise<unknown>,
  onProfileRefresh: (() => Promise<void> | void) | undefined,
) {
  return useCallback(async () => {
    if (onProfileRefresh) {
      await Promise.all([refetch(), Promise.resolve(onProfileRefresh())]);
    } else {
      await refetch();
    }
  }, [refetch, onProfileRefresh]);
}
