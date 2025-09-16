import { BlueskyActors } from './actors';
import { BlueskyAuth } from './auth';
import { BlueskyApiClient } from './client';
import { BlueskyConversations } from './conversations';
import { BlueskyFeeds } from './feeds';
import { BlueskyGraph } from './graph';
import { BlueskyNotifications } from './notifications';
import { BlueskySearch } from './search';
import type {
  BlueskyBookmarksResponse,
  BlueskyConvosResponse,
  BlueskyFeed,
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyMessagesResponse,
  BlueskyNotificationsResponse,
  BlueskyPostView,
  BlueskyPreferencesResponse,
  BlueskyProfileResponse,
  BlueskySearchActorsResponse,
  BlueskySearchPostsResponse,
  BlueskySendMessageResponse,
  BlueskySession,
  BlueskyStarterPacksResponse,
  BlueskyThreadResponse,
} from './types';

/**
 * Main Bluesky API client that combines all functionality
 */
export class BlueskyApi extends BlueskyApiClient {
  private actors: BlueskyActors;
  private auth: BlueskyAuth;
  private conversations: BlueskyConversations;
  private feeds: BlueskyFeeds;
  private graph: BlueskyGraph;
  private notifications: BlueskyNotifications;
  private search: BlueskySearch;

  constructor(pdsUrl: string) {
    super(pdsUrl);
    this.actors = new BlueskyActors(pdsUrl);
    this.auth = new BlueskyAuth(pdsUrl);
    this.conversations = new BlueskyConversations(pdsUrl);
    this.feeds = new BlueskyFeeds(pdsUrl);
    this.graph = new BlueskyGraph(pdsUrl);
    this.notifications = new BlueskyNotifications(pdsUrl);
    this.search = new BlueskySearch(pdsUrl);
  }

  // Auth methods
  async createSession(identifier: string, password: string): Promise<BlueskySession> {
    return this.auth.createSession(identifier, password);
  }

  async refreshSession(refreshJwt: string): Promise<BlueskySession> {
    return this.auth.refreshSession(refreshJwt);
  }

  // Feed methods
  async getProfile(accessJwt: string, did: string): Promise<BlueskyProfileResponse> {
    return this.actors.getProfile(accessJwt, did);
  }

  async updateProfile(
    accessJwt: string,
    profileData: {
      displayName?: string;
      description?: string;
      avatar?: string;
      banner?: string;
    },
  ): Promise<BlueskyProfileResponse> {
    return this.actors.updateProfile(accessJwt, profileData);
  }

  async getPreferences(accessJwt: string): Promise<BlueskyPreferencesResponse> {
    return this.actors.getPreferences(accessJwt);
  }

  async getTimeline(accessJwt: string, limit: number = 20): Promise<BlueskyFeedResponse> {
    return this.feeds.getTimeline(accessJwt, limit);
  }

  async getFeeds(accessJwt: string, actor: string, limit: number = 50, cursor?: string): Promise<BlueskyFeedsResponse> {
    return this.feeds.getFeeds(accessJwt, actor, limit, cursor);
  }

  async getFeed(accessJwt: string, feed: string, limit: number = 50, cursor?: string): Promise<BlueskyFeedResponse> {
    return this.feeds.getFeed(accessJwt, feed, limit, cursor);
  }

  async getFeedGenerators(accessJwt: string, feeds: string[]): Promise<{ feeds: BlueskyFeed[] }> {
    return this.feeds.getFeedGenerators(accessJwt, feeds);
  }

  async getBookmarks(
    accessJwt: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyBookmarksResponse> {
    return this.feeds.getBookmarks(accessJwt, limit, cursor);
  }

  async getPost(accessJwt: string, uri: string): Promise<BlueskyPostView> {
    return this.feeds.getPost(accessJwt, uri);
  }

  async getPostThread(accessJwt: string, uri: string): Promise<BlueskyThreadResponse> {
    return this.feeds.getPostThread(accessJwt, uri);
  }

  async getAuthorFeed(
    accessJwt: string,
    actor: string,
    limit: number = 20,
    cursor?: string,
    filter?: 'posts_with_replies' | 'posts_no_replies' | 'posts_with_media' | 'posts_and_author_threads',
  ): Promise<BlueskyFeedResponse> {
    return this.feeds.getAuthorFeed(accessJwt, actor, limit, cursor, filter);
  }

  async getAuthorVideos(
    accessJwt: string,
    actor: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<BlueskyFeedResponse> {
    return this.feeds.getAuthorVideos(accessJwt, actor, limit, cursor);
  }

  async getAuthorFeeds(
    accessJwt: string,
    actor: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyFeedsResponse> {
    return this.feeds.getAuthorFeeds(accessJwt, actor, limit, cursor);
  }

  async getAuthorStarterpacks(
    accessJwt: string,
    actor: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyStarterPacksResponse> {
    return this.feeds.getAuthorStarterpacks(accessJwt, actor, limit, cursor);
  }

  async createPost(
    accessJwt: string,
    userDid: string,
    post: {
      text: string;
      replyTo?: {
        root: string;
        parent: string;
      };
      images?: {
        uri: string;
        alt: string;
        mimeType: string;
      }[];
    },
  ) {
    return this.feeds.createPost(accessJwt, userDid, post);
  }

  async uploadImage(accessJwt: string, imageUri: string, mimeType: string) {
    return this.feeds.uploadImage(accessJwt, imageUri, mimeType);
  }

  // Like/Unlike methods
  async likePost(accessJwt: string, postUri: string, postCid: string, userDid: string) {
    return this.feeds.likePost(accessJwt, postUri, postCid, userDid);
  }

  async unlikePost(accessJwt: string, likeUri: string, userDid: string) {
    return this.feeds.unlikePost(accessJwt, likeUri, userDid);
  }

  // Conversation methods
  async listConversations(
    accessJwt: string,
    limit: number = 50,
    cursor?: string,
    readState?: 'unread',
    status?: 'request' | 'accepted',
  ): Promise<BlueskyConvosResponse> {
    return this.conversations.listConversations(accessJwt, limit, cursor, readState, status);
  }

  async getMessages(
    accessJwt: string,
    convoId: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyMessagesResponse> {
    return this.conversations.getMessages(accessJwt, convoId, limit, cursor);
  }

  async sendMessage(
    accessJwt: string,
    convoId: string,
    message: {
      text: string;
    },
  ): Promise<BlueskySendMessageResponse> {
    return this.conversations.sendMessage(accessJwt, convoId, message);
  }

  // Graph methods (follow/block/mute)
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

  async muteUser(accessJwt: string, actor: string) {
    return this.graph.muteUser(accessJwt, actor);
  }

  async unmuteUser(accessJwt: string, actor: string) {
    return this.graph.unmuteUser(accessJwt, actor);
  }

  async muteActorList(accessJwt: string, list: string) {
    return this.graph.muteActorList(accessJwt, list);
  }

  async muteThread(accessJwt: string, root: string) {
    return this.graph.muteThread(accessJwt, root);
  }

  // Search methods
  async searchProfiles(
    accessJwt: string,
    query: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<BlueskySearchActorsResponse> {
    return this.search.searchProfiles(accessJwt, query, limit, cursor);
  }

  async searchPosts(
    accessJwt: string,
    query: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<BlueskySearchPostsResponse> {
    return this.search.searchPosts(accessJwt, query, limit, cursor);
  }

  // Notification methods
  async listNotifications(
    accessJwt: string,
    limit: number = 50,
    cursor?: string,
    reasons?: string[],
    priority?: boolean,
    seenAt?: string,
  ): Promise<BlueskyNotificationsResponse> {
    return this.notifications.listNotifications(accessJwt, limit, cursor, reasons, priority, seenAt);
  }

  async getUnreadNotificationsCount(accessJwt: string): Promise<{ count: number }> {
    return this.notifications.getUnreadCount(accessJwt);
  }

  // Static factory method for custom PDS
  static createWithPDS(pdsUrl: string): BlueskyApi {
    return new BlueskyApi(pdsUrl);
  }
}
