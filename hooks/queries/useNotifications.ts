import { useInfiniteQuery } from "@tanstack/react-query";

import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";

type NotificationError = {
  type: "permission" | "network" | "unknown";
  message: string;
};

/**
 * Infinite query hook for fetching notifications
 * @param limit - Number of notifications to fetch per page (1-100, default: 50)
 * @param reasons - Notification reasons to include
 * @param priority - Whether to include priority notifications
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useNotifications(
  limit: number = 50,
  reasons?: string[],
  priority?: boolean,
  enabled: boolean = true
) {
  // Get current user data for query key
  const currentUser = jwtStorage.getUserData();
  const currentUserDid = currentUser?.did;

  return useInfiniteQuery({
    queryKey: ["notifications", limit, reasons, priority, currentUserDid],
    queryFn: async ({ pageParam }) => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      try {
        const response = await blueskyApi.listNotifications(
          token,
          limit,
          pageParam, // cursor
          reasons,
          priority
        );

        // Transform the data to match our UI needs
        const notifications = response.notifications.map((notification) => {
          // Extract post content from the record
          let postContent: string | undefined;
          if (notification.record && notification.record.text) {
            postContent = notification.record.text;
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
          };
        });

        return {
          notifications,
          cursor: response.cursor,
          priority: response.priority,
          seenAt: response.seenAt,
        };
      } catch (error: any) {
        // Determine the type of error
        let errorType: NotificationError["type"] = "unknown";
        let errorMessage = "Failed to load notifications";

        if (error?.response?.status === 401) {
          errorType = "permission";
          errorMessage = "Authentication failed. Please sign in again.";
        } else if (error?.response?.status === 403) {
          errorType = "permission";
          errorMessage = "Access to notifications is not allowed";
        } else if (
          error?.message?.includes("network") ||
          error?.code === "NETWORK_ERROR"
        ) {
          errorType = "network";
          errorMessage =
            "Network error. Please check your connection and try again";
        } else if (error?.response?.status >= 500) {
          errorType = "network";
          errorMessage = "Server error. Please try again later";
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
    enabled: enabled && !!jwtStorage.getToken() && !!currentUserDid,
    staleTime: 30 * 1000, // 30 seconds
    retry: (failureCount, error: any) => {
      // Don't retry permission errors
      if (error?.type === "permission") {
        return false;
      }
      // Retry network errors up to 3 times
      return failureCount < 3;
    },
  });
}
