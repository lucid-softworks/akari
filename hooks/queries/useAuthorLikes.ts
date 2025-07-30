import { useQuery } from "@tanstack/react-query";

import { useJwtToken } from "@/hooks/queries/useJwtToken";
import { blueskyApi } from "@/utils/blueskyApi";

/**
 * Query hook for fetching posts that a user has liked
 * @param identifier - The user's handle or DID
 */
export function useAuthorLikes(identifier: string | undefined) {
  const { data: token } = useJwtToken();

  return useQuery({
    queryKey: ["authorLikes", identifier],
    queryFn: async () => {
      if (!token) throw new Error("No access token");
      if (!identifier) throw new Error("No identifier provided");

      const feed = await blueskyApi.getAuthorFeed(token, identifier, 50);

      // Filter to only show posts that the user has liked
      const likes = feed.feed
        .filter((item) => {
          // Only include posts that the user has liked
          return item.post.viewer?.like;
        })
        .map((item) => item.post);

      // Deduplicate posts by URI to prevent duplicate keys
      const uniqueLikes = likes.filter(
        (post, index, self) =>
          index === self.findIndex((p) => p.uri === post.uri)
      );

      return uniqueLikes;
    },
    enabled: !!identifier && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
