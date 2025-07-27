import { BlueskyAuth } from "./auth";
import { BlueskyApiClient } from "./client";
import { BlueskyFeeds } from "./feeds";
import { BlueskySearch } from "./search";
import type {
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyPostView,
  BlueskySearchActorsResponse,
  BlueskySearchPostsResponse,
  BlueskySession,
  BlueskyThreadResponse,
} from "./types";

/**
 * Main Bluesky API client that combines all functionality
 */
export class BlueskyApi extends BlueskyApiClient {
  private auth: BlueskyAuth;
  private feeds: BlueskyFeeds;
  private search: BlueskySearch;

  constructor(pdsUrl?: string) {
    super(pdsUrl);
    this.auth = new BlueskyAuth(pdsUrl);
    this.feeds = new BlueskyFeeds(pdsUrl);
    this.search = new BlueskySearch(pdsUrl);
  }

  // Authentication methods
  async createSession(
    identifier: string,
    password: string
  ): Promise<BlueskySession> {
    return this.auth.createSession(identifier, password);
  }

  async refreshSession(refreshJwt: string): Promise<BlueskySession> {
    return this.auth.refreshSession(refreshJwt);
  }

  // Feed methods
  async getProfile(accessJwt: string, did: string) {
    return this.feeds.getProfile(accessJwt, did);
  }

  async getTimeline(accessJwt: string, limit: number = 20) {
    return this.feeds.getTimeline(accessJwt, limit);
  }

  async getFeeds(
    accessJwt: string,
    actor: string,
    limit: number = 50,
    cursor?: string
  ): Promise<BlueskyFeedsResponse> {
    return this.feeds.getFeeds(accessJwt, actor, limit, cursor);
  }

  async getFeed(
    accessJwt: string,
    feed: string,
    limit: number = 50,
    cursor?: string
  ): Promise<BlueskyFeedResponse> {
    return this.feeds.getFeed(accessJwt, feed, limit, cursor);
  }

  async getPost(accessJwt: string, uri: string): Promise<BlueskyPostView> {
    return this.feeds.getPost(accessJwt, uri);
  }

  async getPostThread(
    accessJwt: string,
    uri: string
  ): Promise<BlueskyThreadResponse> {
    return this.feeds.getPostThread(accessJwt, uri);
  }

  async getAuthorFeed(
    accessJwt: string,
    actor: string,
    limit: number = 20,
    cursor?: string
  ): Promise<BlueskyFeedResponse> {
    return this.feeds.getAuthorFeed(accessJwt, actor, limit, cursor);
  }

  // Search methods
  async searchProfiles(
    accessJwt: string,
    query: string,
    limit: number = 20
  ): Promise<BlueskySearchActorsResponse> {
    return this.search.searchProfiles(accessJwt, query, limit);
  }

  async searchPosts(
    accessJwt: string,
    query: string,
    limit: number = 20
  ): Promise<BlueskySearchPostsResponse> {
    return this.search.searchPosts(accessJwt, query, limit);
  }

  /**
   * Creates a new BlueskyApi instance with a custom PDS URL
   * @param pdsUrl - The custom PDS URL
   * @returns New BlueskyApi instance
   */
  static createWithPDS(pdsUrl: string): BlueskyApi {
    return new BlueskyApi(pdsUrl);
  }
}
