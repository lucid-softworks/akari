import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { blueskyApi } from '@/utils/blueskyApi';

/**
 * Hook to get the count of unread notifications
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useUnreadNotificationsCount(enabled: boolean = true) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const currentUserDid = currentAccount?.did;

  return useQuery({
    queryKey: ['unreadNotificationsCount', currentUserDid],
    queryFn: async () => {
      if (!token) throw new Error('No access token');

      try {
        // Use the dedicated unread count endpoint
        const response = await blueskyApi.getUnreadNotificationsCount(token);
        return response.count;
      } catch (error: unknown) {
        // If there's an error, return 0 to avoid breaking the UI
        console.warn('Failed to fetch unread notifications count:', error);
        return 0;
      }
    },
    enabled: enabled && !!token && !!currentUserDid,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: (failureCount) => {
      // Only retry up to 2 times for this query
      return failureCount < 2;
    },
  });
}
