import { useQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { blueskyApi } from '@/utils/blueskyApi';

/**
 * Hook to get the total count of unread messages across all conversations
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useUnreadMessagesCount(enabled: boolean = true) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const currentUserDid = currentAccount?.did;

  return useQuery({
    queryKey: ['unreadMessagesCount', currentUserDid],
    queryFn: async () => {
      if (!token) throw new Error('No access token');

      try {
        // Fetch conversations to get unread counts
        const response = await blueskyApi.listConversations(
          token,
          100, // Fetch up to 100 conversations to get a good sample
          undefined, // cursor
          undefined, // readState
          'accepted', // Only count accepted conversations
        );

        // Sum up all unread counts
        const totalUnreadCount = response.convos.reduce((total, convo) => total + convo.unreadCount, 0);

        return totalUnreadCount;
      } catch (error: unknown) {
        // If there's an error, return 0 to avoid breaking the UI
        console.warn('Failed to fetch unread messages count:', error);
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
