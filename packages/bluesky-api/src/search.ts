import { BlueskyApiClient } from './client';
import type { BlueskySearchActorsResponse, BlueskySearchPostsResponse } from './types';

/**
 * Bluesky API search methods
 */
export class BlueskySearch extends BlueskyApiClient {
  /**
   * Searches for profiles
   * @param query - Search query
   * @param limit - Number of results to fetch (default: 20)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to search results
   */
  async searchProfiles(query: string, limit: number = 20, cursor?: string): Promise<BlueskySearchActorsResponse> {
    const params: Record<string, string> = {
      q: query,
      limit: limit.toString(),
      ...(cursor && { cursor }),
    };

    return this.makeAuthenticatedRequest<BlueskySearchActorsResponse>(
      '/app.bsky.actor.searchActors',
      {
        params,
      },
    );
  }

  /**
   * Searches for posts
   * @param query - Search query
   * @param limit - Number of results to fetch (default: 20)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to search results
   */
  async searchPosts(query: string, limit: number = 20, cursor?: string): Promise<BlueskySearchPostsResponse> {
    const params: Record<string, string> = {
      q: query,
      limit: limit.toString(),
      ...(cursor && { cursor }),
    };

    return this.makeAuthenticatedRequest<BlueskySearchPostsResponse>(
      '/app.bsky.feed.searchPosts',
      {
        params,
      },
    );
  }
}
