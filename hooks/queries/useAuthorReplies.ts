import { useQuery } from "@tanstack/react-query";

import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";

/**
 * Query hook for fetching a user's replies
 * @param identifier - The user's handle or DID
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useAuthorReplies(identifier: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["authorReplies", identifier],
    queryFn: async () => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      const feed = await blueskyApi.getAuthorFeed(token, identifier, 50);

      // Filter to only show replies
      const replies = feed.feed
        .filter((item) => {
          // Only include posts that are replies
          return item.reply;
        })
        .map((item) => item.post);

      // Deduplicate posts by URI to prevent duplicate keys
      const uniqueReplies = replies.filter(
        (post, index, self) =>
          index === self.findIndex((p) => p.uri === post.uri)
      );

      return uniqueReplies;
    },
    enabled: enabled && !!identifier,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
