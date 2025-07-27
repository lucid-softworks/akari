import { BlueskyActors } from "./actors";
import { BlueskyAuth } from "./auth";
import { BlueskyApiClient } from "./client";
import { BlueskyConversations } from "./conversations";
import { BlueskyFeeds } from "./feeds";
import { BlueskyGraph } from "./graph";
import { BlueskySearch } from "./search";
import type {
  BlueskyConvosResponse,
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyMessagesResponse,
  BlueskyPostView,
  BlueskyProfileResponse,
  BlueskySearchActorsResponse,
  BlueskySearchPostsResponse,
  BlueskySession,
  BlueskyThreadResponse,
} from "./types";

/**
 * Main Bluesky API client that combines all functionality
 */
export class BlueskyApi extends BlueskyApiClient {
  private actors: BlueskyActors;
  private auth: BlueskyAuth;
  private conversations: BlueskyConversations;
  private feeds: BlueskyFeeds;
  private graph: BlueskyGraph;
  private search: BlueskySearch;

  constructor(pdsUrl?: string) {
    super(pdsUrl);
    this.actors = new BlueskyActors(pdsUrl);
    this.auth = new BlueskyAuth(pdsUrl);
    this.conversations = new BlueskyConversations(pdsUrl);
    this.feeds = new BlueskyFeeds(pdsUrl);
    this.graph = new BlueskyGraph(pdsUrl);
    this.search = new BlueskySearch(pdsUrl);
  }

  // Auth methods
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
  async getProfile(
    accessJwt: string,
    did: string
  ): Promise<BlueskyProfileResponse> {
    return this.actors.getProfile(accessJwt, did);
  }

  async getTimeline(
    accessJwt: string,
    limit: number = 20
  ): Promise<BlueskyFeedResponse> {
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

  // Conversation methods
  async listConversations(
    accessJwt: string,
    limit: number = 50,
    cursor?: string,
    readState?: "unread",
    status?: "request" | "accepted"
  ): Promise<BlueskyConvosResponse> {
    return this.conversations.listConversations(
      accessJwt,
      limit,
      cursor,
      readState,
      status
    );
  }

  async getMessages(
    accessJwt: string,
    convoId: string,
    limit: number = 50,
    cursor?: string
  ): Promise<BlueskyMessagesResponse> {
    return this.conversations.getMessages(accessJwt, convoId, limit, cursor);
  }

  // Graph methods (follow/block)
  async followUser(accessJwt: string, did: string) {
    return this.graph.followUser(accessJwt, did);
  }

  async unfollowUser(accessJwt: string, followUri: string) {
    return this.graph.unfollowUser(accessJwt, followUri);
  }

  async blockUser(accessJwt: string, did: string) {
    return this.graph.blockUser(accessJwt, did);
  }

  async unblockUser(accessJwt: string, blockUri: string) {
    return this.graph.unblockUser(accessJwt, blockUri);
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

  // Static factory method for custom PDS
  static createWithPDS(pdsUrl: string): BlueskyApi {
    return new BlueskyApi(pdsUrl);
  }
}
