import { useInfiniteQuery } from "@tanstack/react-query";

import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";

type MessageError = {
  type: "permission" | "network" | "unknown";
  message: string;
};

/**
 * Infinite query hook for fetching messages in a conversation
 * @param convoId - The conversation ID
 * @param limit - Number of messages to fetch per page (1-100, default: 50)
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useMessages(
  convoId: string,
  limit: number = 50,
  enabled: boolean = true
) {
  // Get current user data for query key
  const currentUser = jwtStorage.getUserData();
  const currentUserDid = currentUser?.did;

  return useInfiniteQuery({
    queryKey: ["messages", convoId, limit, currentUserDid],
    queryFn: async ({ pageParam }) => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      console.log(
        "Fetching messages for conversation:",
        convoId,
        "page:",
        pageParam,
        "user:",
        currentUserDid
      );

      try {
        const response = await blueskyApi.getMessages(
          token,
          convoId,
          limit,
          pageParam // cursor
        );

        console.log(
          "Messages API response:",
          JSON.stringify(response, null, 2)
        );

        // Transform the data to match our UI needs
        const messages = response.messages.map((message) => {
          const currentUser = jwtStorage.getUserData();
          const isFromMe = message.sender.did === currentUser.did;

          return {
            id: message.id,
            text: message.text || "",
            timestamp: new Date(message.sentAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isFromMe,
            sentAt: message.sentAt,
          };
        });

        console.log("Transformed messages:", messages);

        return {
          messages,
          cursor: response.cursor,
        };
      } catch (error: any) {
        console.error("Messages API error:", error);
        console.error("Error response:", error?.response);
        console.error("Error message:", error?.message);

        // Determine the type of error
        let errorType: MessageError["type"] = "unknown";
        let errorMessage = "Failed to load messages";

        if (error?.response?.status === 401) {
          errorType = "permission";
          errorMessage =
            "Your app password doesn't have permission to access messages";
        } else if (error?.response?.status === 403) {
          errorType = "permission";
          errorMessage =
            "Access to messages is not allowed with this app password";
        } else if (error?.message?.includes("Bad token scope")) {
          errorType = "permission";
          errorMessage =
            "Your app password doesn't have chat permissions. Please create a new app password with chat access in your Bluesky settings.";
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

        const messageError: MessageError = {
          type: errorType,
          message: errorMessage,
        };

        throw messageError;
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled:
      enabled && !!jwtStorage.getToken() && !!convoId && !!currentUserDid,
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
