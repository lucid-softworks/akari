import { useQuery } from "@tanstack/react-query";

import { blueskyApi } from "@/utils/blueskyApi";
import { jwtStorage } from "@/utils/secureStorage";

/**
 * Query hook for fetching a user's profile information
 * @param identifier - The user's handle or DID
 * @param enabled - Whether the query should be enabled (default: true)
 */
export function useProfile(identifier: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["profile", identifier],
    queryFn: async () => {
      const token = jwtStorage.getToken();
      if (!token) throw new Error("No access token");

      const profile = await blueskyApi.getProfile(token, identifier);
      console.log("PROFILE DATA:", JSON.stringify(profile, null, 2));

      // Also fetch user's posts
      const posts = await blueskyApi.getAuthorFeed(token, identifier, 50);

      // Filter to only show original posts (not reposts or replies)
      const originalPosts = posts.feed
        .filter((item) => {
          // Only include posts that are not reposts and not replies
          return !item.reason && !item.reply;
        })
        .map((item) => item.post);

      return {
        ...profile, // Spread the profile data directly
        posts: originalPosts,
      };
    },
    enabled: enabled && !!identifier,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
