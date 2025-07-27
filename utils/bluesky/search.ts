import { BlueskyApiClient } from "./client";
import type {
  BlueskySearchActorsResponse,
  BlueskySearchPostsResponse,
} from "./types";

/**
 * Bluesky API search methods
 */
export class BlueskySearch extends BlueskyApiClient {
  /**
   * Searches for profiles
   * @param accessJwt - Valid access JWT token
   * @param query - Search query
   * @param limit - Number of results to fetch (default: 20)
   * @returns Promise resolving to search results
   */
  async searchProfiles(
    accessJwt: string,
    query: string,
    limit: number = 20
  ): Promise<BlueskySearchActorsResponse> {
    return this.makeAuthenticatedRequest<BlueskySearchActorsResponse>(
      "/app.bsky.actor.searchActors",
      accessJwt,
      {
        params: {
          q: query,
          limit: limit.toString(),
        },
      }
    );
  }

  /**
   * Searches for posts
   * @param accessJwt - Valid access JWT token
   * @param query - Search query
   * @param limit - Number of results to fetch (default: 20)
   * @returns Promise resolving to search results
   */
  async searchPosts(
    accessJwt: string,
    query: string,
    limit: number = 20
  ): Promise<BlueskySearchPostsResponse> {
    return this.makeAuthenticatedRequest<BlueskySearchPostsResponse>(
      "/app.bsky.feed.searchPosts",
      accessJwt,
      {
        params: {
          q: query,
          limit: limit.toString(),
        },
      }
    );
  }
}
