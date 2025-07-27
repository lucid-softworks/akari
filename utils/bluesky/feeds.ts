import { BlueskyApiClient } from "./client";
import type {
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyPostView,
  BlueskyThreadResponse,
} from "./types";

/**
 * Bluesky API feed methods
 */
export class BlueskyFeeds extends BlueskyApiClient {
  /**
   * Gets the user's timeline feed
   * @param accessJwt - Valid access JWT token
   * @param limit - Number of posts to fetch (default: 20)
   * @returns Promise resolving to timeline data
   */
  async getTimeline(
    accessJwt: string,
    limit: number = 20
  ): Promise<BlueskyFeedResponse> {
    return this.makeAuthenticatedRequest<BlueskyFeedResponse>(
      "/app.bsky.feed.getTimeline",
      accessJwt,
      {
        params: { limit: limit.toString() },
      }
    );
  }

  /**
   * Gets feed generators (feeds) created by an actor
   * @param accessJwt - Valid access JWT token
   * @param actor - The actor's DID or handle
   * @param limit - Number of feeds to fetch (default: 50, max: 100)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to feeds data
   */
  async getFeeds(
    accessJwt: string,
    actor: string,
    limit: number = 50,
    cursor?: string
  ): Promise<BlueskyFeedsResponse> {
    const params: Record<string, string> = {
      actor,
      limit: limit.toString(),
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return this.makeAuthenticatedRequest<BlueskyFeedsResponse>(
      "/app.bsky.feed.getActorFeeds",
      accessJwt,
      { params }
    );
  }

  /**
   * Gets posts from a specific feed generator
   * @param accessJwt - Valid access JWT token
   * @param feed - The feed's URI
   * @param limit - Number of posts to fetch (default: 50, max: 100)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to feed posts data
   */
  async getFeed(
    accessJwt: string,
    feed: string,
    limit: number = 50,
    cursor?: string
  ): Promise<BlueskyFeedResponse> {
    const params: Record<string, string> = {
      feed,
      limit: limit.toString(),
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return this.makeAuthenticatedRequest<BlueskyFeedResponse>(
      "/app.bsky.feed.getFeed",
      accessJwt,
      { params }
    );
  }

  /**
   * Gets a specific post by its URI
   * @param accessJwt - Valid access JWT token
   * @param uri - The post's URI
   * @returns Promise resolving to post data
   */
  async getPost(accessJwt: string, uri: string): Promise<BlueskyPostView> {
    const data = await this.makeAuthenticatedRequest<{
      thread?: { post: BlueskyPostView };
    }>("/app.bsky.feed.getPostThread", accessJwt, {
      params: { uri },
    });
    if (!data.thread?.post) {
      throw new Error("Post not found");
    }
    return data.thread.post;
  }

  /**
   * Gets a post thread including replies
   * @param accessJwt - Valid access JWT token
   * @param uri - The post's URI
   * @returns Promise resolving to thread data
   */
  async getPostThread(
    accessJwt: string,
    uri: string
  ): Promise<BlueskyThreadResponse> {
    return this.makeAuthenticatedRequest<BlueskyThreadResponse>(
      "/app.bsky.feed.getPostThread",
      accessJwt,
      {
        params: { uri },
      }
    );
  }

  /**
   * Gets posts from a specific author
   * @param accessJwt - Valid access JWT token
   * @param actor - The author's handle or DID
   * @param limit - Number of posts to fetch (default: 20)
   * @param cursor - Pagination cursor
   * @returns Promise resolving to author feed data
   */
  async getAuthorFeed(
    accessJwt: string,
    actor: string,
    limit: number = 20,
    cursor?: string
  ): Promise<BlueskyFeedResponse> {
    const params: Record<string, string> = {
      actor,
      limit: limit.toString(),
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return this.makeAuthenticatedRequest<BlueskyFeedResponse>(
      "/app.bsky.feed.getAuthorFeed",
      accessJwt,
      { params }
    );
  }
}
