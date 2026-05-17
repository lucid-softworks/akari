import { useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { useAppViewEnabled } from '@/hooks/useAppViewEnabled';
import { readAppViewEnabled } from '@/hooks/useAppViewSettings';
import { BlueskyEmbed } from '@/bluesky-api';
import { AppViewRequiredError, isAppViewRequiredError } from '@/utils/appView';
import { apiForAccount } from '@/utils/blueskyApi';
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
  const appViewEnabled = useAppViewEnabled();

  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list({ limit, reasons, priority, did: currentUserDid, appViewEnabled }),
    queryFn: async ({ pageParam }) => {
      // Notifications genuinely need an AppView: without it we'd have to
      // listRecords every one of the user's posts (could be 10k+) and
      // run a constellation query per post. Constellation has no "all
      // engagement on anything I've posted" query, so this can't be done
      // at scale. Honest answer is "this feature needs an AppView."
      if (!readAppViewEnabled()) throw new AppViewRequiredError('notifications');
      if (!token) throw new Error('No access token');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      try {
        const api = apiForAccount(currentAccount);
        const response = await api.listNotifications(
          token,
          limit,
          pageParam, // cursor
          reasons,
          priority,
        );

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
            // Notification's own record URI — distinct from
            // `reasonSubject` (which is the URI of the thing the action
            // targets, e.g. the *parent* post for a reply). Tapping a
            // reply / quote / mention notification should land on
            // `uri`, not `reasonSubject`. Previously this field was
            // dropped during the transform and downstream code silently
            // fell back to reasonSubject, sending taps to the parent.
            uri: notification.uri,
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
    retry: (failureCount, error: NotificationError | Error) => {
      // AppView disabled — terminal, no point retrying.
      if (isAppViewRequiredError(error)) return false;
      // Don't retry permission errors
      if ((error as NotificationError)?.type === 'permission') {
        return false;
      }
      // Retry network errors up to 3 times
      return failureCount < 3;
    },
  });
}
