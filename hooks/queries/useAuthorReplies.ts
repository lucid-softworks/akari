import { useQuery } from "@tanstack/react-query";

import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { blueskyApi } from "@/utils/blueskyApi";

/**
 * Query hook for fetching a user's replies
 * @param identifier - The user's handle or DID
 */
export function useAuthorReplies(identifier: string | undefined) {
  const { data: token } = useJwtToken();

  return useQuery({
    queryKey: ["authorReplies", identifier],
    queryFn: async () => {
      if (!token) throw new Error("No access token");
      if (!identifier) throw new Error("No identifier provided");

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
    enabled: !!identifier && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
