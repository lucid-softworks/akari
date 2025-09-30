import { useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { BlueskyEmbed } from '@/bluesky-api';
import { BlueskyApi } from '@/bluesky-api';

type NotificationError = {
  type: 'permission' | 'network' | 'unknown';
  message: string;
};

/**
 * Infinite query hook for fetching notifications
 * @param limit - Number of notifications to fetch per page (1-100, default: 50)
 * @param reasons - Notification reasons to include
 * @param priority - Whether to include priority notifications
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useNotifications(limit: number = 50, reasons?: string[], priority?: boolean, enabled: boolean = true) {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();
  const currentUserDid = currentAccount?.did;

  return useInfiniteQuery({
    queryKey: ['notifications', limit, reasons, priority, currentUserDid],
    queryFn: async ({ pageParam }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      try {
        const api = new BlueskyApi(currentAccount.pdsUrl);
        const response = await api.listNotifications(limit, pageParam, reasons, priority);

        // Transform the data to match our UI needs
        const notifications = response.notifications.map((notification) => {
          // Extract post content from the record
          let postContent: string | undefined;
          let embed: BlueskyEmbed | undefined;

          if (notification.record && typeof notification.record === 'object') {
            if ('text' in notification.record) {
              postContent = (notification.record as { text: string }).text;
            }
            if ('embed' in notification.record) {
              embed = (notification.record as { embed: BlueskyEmbed }).embed;
            }
          }

          return {
            id: notification.uri,
            author: {
              did: notification.author.did,
              handle: notification.author.handle,
              displayName: notification.author.displayName,
              avatar: notification.author.avatar,
            },
            reason: notification.reason,
            reasonSubject: notification.reasonSubject,
            isRead: notification.isRead,
            indexedAt: notification.indexedAt,
            record: notification.record,
            postContent,
            embed,
          };
        });

        return {
          notifications,
          cursor: response.cursor,
          priority: response.priority,
          seenAt: response.seenAt,
        };
      } catch (error: unknown) {
        // Determine the type of error
        let errorType: NotificationError['type'] = 'unknown';
        let errorMessage = 'Failed to load notifications';

        const errorObj = error as {
          response?: { status?: number };
          message?: string;
          code?: string;
        };

        if (errorObj?.response?.status === 401) {
          errorType = 'permission';
          errorMessage = 'Authentication failed. Please sign in again.';
        } else if (errorObj?.response?.status === 403) {
          errorType = 'permission';
          errorMessage = 'Access to notifications is not allowed';
        } else if (errorObj?.message?.includes('network') || errorObj?.code === 'NETWORK_ERROR') {
          errorType = 'network';
          errorMessage = 'Network error. Please check your connection and try again';
        } else if (errorObj?.response?.status && errorObj.response.status >= 500) {
          errorType = 'network';
          errorMessage = 'Server error. Please try again later';
        }

        const notificationError: NotificationError = {
          type: errorType,
          message: errorMessage,
        };

        throw notificationError;
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: enabled && !!token && !!currentUserDid,
    staleTime: 30 * 1000, // 30 seconds
    retry: (failureCount, error: NotificationError) => {
      // Don't retry permission errors
      if (error?.type === 'permission') {
        return false;
      }
      // Retry network errors up to 3 times
      return failureCount < 3;
    },
  });
}
