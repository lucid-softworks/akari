import { useInfiniteQuery } from "@tanstack/react-query";

import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";

type ConversationError = {
  type: "permission" | "network" | "unknown";
  message: string;
};

/**
 * Infinite query hook for fetching conversations with pagination
 * @param limit - Number of conversations to fetch per page (1-100, default: 50)
 * @param readState - Filter by read state ("unread")
 * @param status - Filter by status ("request" or "accepted")
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useConversations(
  limit: number = 50,
  readState?: "unread",
  status?: "request" | "accepted",
  enabled: boolean = true
) {
  return useInfiniteQuery({
    queryKey: ["conversations", limit, readState, status],
    queryFn: async ({ pageParam }) => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      console.log("Fetching conversations page:", pageParam);

      try {
        const response = await blueskyApi.listConversations(
          token,
          limit,
          pageParam, // cursor
          readState,
          status
        );

        console.log(
          "Conversations API response:",
          JSON.stringify(response, null, 2)
        );

        // Transform the data to match our UI needs
        const conversations = response.convos.map((convo) => {
          // Find the other member (not the current user)
          const currentUser = jwtStorage.getUserData();
          const otherMember = convo.members.find(
            (member) => member.did !== currentUser.did
          );

          if (!otherMember) {
            throw new Error("No other member found in conversation");
          }

          return {
            id: convo.id,
            handle: otherMember.handle,
            displayName: otherMember.displayName || otherMember.handle,
            avatar: otherMember.avatar,
            lastMessage: convo.lastMessage?.text || "No messages yet",
            timestamp: convo.lastMessage?.sentAt
              ? new Date(convo.lastMessage.sentAt).toLocaleDateString()
              : "No messages",
            unreadCount: convo.unreadCount,
            status: convo.status,
            muted: convo.muted,
          };
        });

        console.log("Transformed conversations:", conversations);

        return {
          conversations,
          cursor: response.cursor,
        };
      } catch (error: any) {
        console.error("Conversations API error:", error);
        console.error("Error response:", error?.response);
        console.error("Error message:", error?.message);

        // Determine the type of error
        let errorType: ConversationError["type"] = "unknown";
        let errorMessage = "Failed to load conversations";

        if (error?.response?.status === 401) {
          errorType = "permission";
          errorMessage =
            "Your app password doesn't have permission to access messages";
        } else if (error?.response?.status === 403) {
          errorType = "permission";
          errorMessage =
            "Access to messages is not allowed with this app password";
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

        const conversationError: ConversationError = {
          type: errorType,
          message: errorMessage,
        };

        throw conversationError;
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: enabled && !!jwtStorage.getToken(),
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
