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
  BlueskyFeedGeneratorsResponse,
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyMessagesResponse,
  BlueskyCreatePostInput,
  BlueskyCreatePostResponse,
  BlueskyNotificationsResponse,
  BlueskyPostView,
  BlueskyPreferencesResponse,
  BlueskyProfileResponse,
  BlueskyProfileUpdateInput,
  BlueskySearchActorsResponse,
  BlueskySearchPostsResponse,
  BlueskySendMessageInput,
  BlueskySendMessageResponse,
  BlueskySession,
  BlueskyStarterPacksResponse,
  BlueskyThreadResponse,
  BlueskyTrendingTopicsResponse,
  BlueskyUnreadNotificationCount,
  BlueskyUploadBlobResponse,
} from './types';

/**
 * Main Bluesky API client that combines all functionality
 */
export class BlueskyApi extends BlueskyApiClient {
  private readonly actors: BlueskyActors;
  private readonly auth: BlueskyAuth;
  private readonly conversations: BlueskyConversations;
  private readonly feeds: BlueskyFeeds;
  private readonly graph: BlueskyGraph;
  private readonly notifications: BlueskyNotifications;
  private readonly search: BlueskySearch;

  /**
   * Creates a convenience wrapper around the various Bluesky domain clients while sharing the base PDS URL.
   * @param pdsUrl - Personal data server URL that hosts the AT Protocol endpoints.
   */
  constructor(pdsUrl: string) {
    super(pdsUrl);

    const sharedOptions = { sessionEvents: this.sessionEvents, sessionState: this.sessionState } as const;

    this.auth = new BlueskyAuth(pdsUrl, sharedOptions);

    const refreshSession = (refreshJwt: string) => this.auth.refreshSession(refreshJwt);
    this.setRefreshSessionHandler(refreshSession);

    const authenticatedOptions = { ...sharedOptions, refreshSession } as const;

    this.actors = new BlueskyActors(pdsUrl, authenticatedOptions);
    this.conversations = new BlueskyConversations(pdsUrl, authenticatedOptions);
    this.feeds = new BlueskyFeeds(pdsUrl, authenticatedOptions);
    this.graph = new BlueskyGraph(pdsUrl, authenticatedOptions);
    this.notifications = new BlueskyNotifications(pdsUrl, authenticatedOptions);
    this.search = new BlueskySearch(pdsUrl, authenticatedOptions);
  }

  /**
   * Creates an authenticated session for the supplied handle or DID using the user's password.
   * The session tokens are stored on the client and emitted to session listeners so consumers can
   * persist refresh credentials when necessary.
   *
   * @param identifier - Handle or DID that should be authenticated.
   * @param password - Account password used to obtain the session tokens.
   * @returns Newly created session tokens for the account.
   */
  async createSession(identifier: string, password: string): Promise<BlueskySession> {
    const session = await this.auth.createSession(identifier, password);
    return this.applySession(session, true);
  }

  /**
   * Alias for {@link createSession} to better describe interactive authentication flows.
   */
  async login(identifier: string, password: string): Promise<BlueskySession> {
    return this.createSession(identifier, password);
  }

  /**
   * Replaces the active session with persisted credentials, typically after loading saved tokens
   * or switching accounts. Does not emit session events because the caller already has the tokens.
   *
   * @param session - Session that should become active for subsequent requests.
   */
  setSession(session: BlueskySession): void {
    this.useSession(session);
  }

  /**
   * Exchanges the stored refresh token for a new authenticated session.
   * The refreshed session is persisted internally and emitted to listeners.
   *
   * @returns Fresh access and refresh token pair from the PDS.
   */
  async refreshSession(): Promise<BlueskySession> {
    const current = this.requireSession();
    const refreshed = await this.auth.refreshSession(current.refreshJwt);
    return this.applySession(refreshed, true);
  }

  /**
   * Loads profile metadata and viewer state for the requested DID.
   * @param did - DID of the actor whose profile information should be retrieved.
   * @returns Profile record and viewer relationship metadata.
   */
  async getProfile(did: string): Promise<BlueskyProfileResponse> {
    return this.actors.getProfile(did);
  }

  /**
   * Updates profile metadata such as display name, description, avatar or banner in the actor record.
   * @param profileData - Partial profile fields that should be persisted for the actor.
   * @returns Updated profile record returned by Bluesky after the mutation.
   */
  async updateProfile(profileData: BlueskyProfileUpdateInput): Promise<BlueskyProfileResponse> {
    return this.actors.updateProfile(profileData);
  }

  /**
   * Retrieves the authenticated user's current preference records, including saved feeds and content filters.
   * @returns Preference collection describing feed pinning and label settings.
   */
  async getPreferences(): Promise<BlueskyPreferencesResponse> {
    return this.actors.getPreferences();
  }

  /**
   * Fetches the home timeline feed for the authenticated user.
   * @param limit - Maximum number of feed items to return, defaults to 20.
   * @returns Feed page that mirrors the app.bsky.feed.getTimeline endpoint.
   */
  async getTimeline(limit: number = 20): Promise<BlueskyFeedResponse> {
    return this.feeds.getTimeline(limit);
  }

  /**
   * Retrieves the curated trending topics list exposed by Bluesky.
   * @param limit - Maximum number of topics to fetch, defaults to 10.
   * @returns List of trending topic descriptors sourced from the unspecced API.
   */
  async getTrendingTopics(limit: number = 10): Promise<BlueskyTrendingTopicsResponse> {
    return this.feeds.getTrendingTopics(limit);
  }

  /**
   * Lists feed generators created by a particular actor.
   * @param actor - DID or handle identifying the actor whose feeds should be loaded.
   * @param limit - Maximum number of feeds to fetch per page, defaults to 50.
   * @param cursor - Pagination cursor returned from previous requests.
   * @returns Feed generator metadata for the provided actor.
   */
  async getFeeds(actor: string, limit: number = 50, cursor?: string): Promise<BlueskyFeedsResponse> {
    return this.feeds.getFeeds(actor, limit, cursor);
  }

  /**
   * Fetches posts produced by a feed generator.
   * @param feed - AT URI of the feed generator to read.
   * @param limit - Maximum number of posts to request, defaults to 50.
   * @param cursor - Pagination cursor returned by the API, if available.
   * @returns Feed slice containing posts created by the generator.
   */
  async getFeed(feed: string, limit: number = 50, cursor?: string): Promise<BlueskyFeedResponse> {
    return this.feeds.getFeed(feed, limit, cursor);
  }

  /**
   * Resolves metadata for an array of feed generator URIs.
   * @param feeds - List of feed generator URIs that should be described.
   * @returns Collection of feed generator descriptions keyed by Bluesky.
   */
  async getFeedGenerators(feeds: string[]): Promise<BlueskyFeedGeneratorsResponse> {
    return this.feeds.getFeedGenerators(feeds);
  }

  /**
   * Lists the authenticated user's bookmarked posts.
   * @param limit - Maximum number of bookmarks to fetch per page, defaults to 50.
   * @param cursor - Pagination cursor from the previous response, if any.
   * @returns Paginated bookmark feed from the app.bsky.bookmark namespace.
   */
  async getBookmarks(limit: number = 50, cursor?: string): Promise<BlueskyBookmarksResponse> {
    return this.feeds.getBookmarks(limit, cursor);
  }

  /**
   * Loads a single post view by its AT URI, guaranteeing the post exists before returning it.
   * @param uri - AT URI of the post to fetch.
   * @returns Post view containing record data, embeds and viewer state.
   */
  async getPost(uri: string): Promise<BlueskyPostView> {
    return this.feeds.getPost(uri);
  }

  /**
   * Fetches a full thread for a given post including replies and parent context.
   * @param uri - AT URI of the root post to expand.
   * @returns Thread response mirroring the feed.getPostThread endpoint.
   */
  async getPostThread(uri: string): Promise<BlueskyThreadResponse> {
    return this.feeds.getPostThread(uri);
  }

  /**
   * Retrieves an author's posts with optional filtering for replies, media or thread starters.
   * @param actor - DID or handle identifying the author.
   * @param limit - Maximum number of posts to fetch per page, defaults to 20.
   * @param cursor - Pagination cursor from the previous author feed response.
   * @param filter - Optional server-side filter for replies, media, or author threads.
   * @returns Paginated feed slice scoped to the author's posts.
   */
  async getAuthorFeed(
    actor: string,
    limit: number = 20,
    cursor?: string,
    filter?: 'posts_with_replies' | 'posts_no_replies' | 'posts_with_media' | 'posts_and_author_threads',
  ): Promise<BlueskyFeedResponse> {
    return this.feeds.getAuthorFeed(actor, limit, cursor, filter);
  }

  /**
   * Retrieves an author's posts filtered to entries containing uploaded video.
   * @param actor - DID or handle representing the author.
   * @param limit - Maximum number of posts to request, defaults to 20.
   * @param cursor - Optional pagination cursor from the API.
   * @returns Feed page containing only posts with video embeds.
   */
  async getAuthorVideos(actor: string, limit: number = 20, cursor?: string): Promise<BlueskyFeedResponse> {
    return this.feeds.getAuthorVideos(actor, limit, cursor);
  }

  /**
   * Lists feed generators owned by an actor, mirroring getFeeds but scoped to author-owned resources.
   * @param actor - DID or handle representing the author.
   * @param limit - Maximum number of feed generators per page, defaults to 50.
   * @param cursor - Pagination cursor from the previous response, if present.
   * @returns Feed generator list for the supplied actor.
   */
  async getAuthorFeeds(actor: string, limit: number = 50, cursor?: string): Promise<BlueskyFeedsResponse> {
    return this.feeds.getAuthorFeeds(actor, limit, cursor);
  }

  /**
   * Retrieves starter packs curated by an author that bundle suggested follows and feeds.
   * @param actor - DID or handle whose starter packs should be returned.
   * @param limit - Maximum number of starter packs per page, defaults to 50.
   * @param cursor - Pagination cursor from previous starter pack responses.
   * @returns Paginated list of starter packs authored by the given actor.
   */
  async getAuthorStarterpacks(actor: string, limit: number = 50, cursor?: string): Promise<BlueskyStarterPacksResponse> {
    return this.feeds.getAuthorStarterpacks(actor, limit, cursor);
  }

  /**
   * Creates a new post on behalf of the authenticated user including optional reply context and media embeds.
   * @param userDid - DID of the repository where the post should be recorded.
   * @param post - Text, reply references and media attachments to persist in the record.
   * @returns Metadata for the created record including AT URI and commit details.
   */
  async createPost(userDid: string, post: BlueskyCreatePostInput): Promise<BlueskyCreatePostResponse> {
    return this.feeds.createPost(userDid, post);
  }

  /**
   * Uploads a binary blob (image or GIF) to Bluesky and returns the blob reference for embedding.
   * @param imageUri - Local URI that should be fetched and uploaded as a blob.
   * @param mimeType - MIME type associated with the uploaded media.
   * @returns Blob reference structure compatible with Bluesky embed records.
   */
  async uploadImage(imageUri: string, mimeType: string): Promise<BlueskyUploadBlobResponse> {
    return this.feeds.uploadImage(imageUri, mimeType);
  }

  /**
   * Creates a like record for the specified post in the authenticated user's repository.
   * @param postUri - AT URI of the post that should be liked.
   * @param postCid - CID of the post being liked, required by the repo mutation.
   * @param userDid - DID of the repository owner creating the like record.
   * @returns Response emitted by the repo.createRecord mutation.
   */
  async likePost(postUri: string, postCid: string, userDid: string) {
    return this.feeds.likePost(postUri, postCid, userDid);
  }

  /**
   * Removes an existing like record from the authenticated user's repository.
   * @param likeUri - URI of the like record to delete.
   * @param userDid - DID of the repository owner removing the like record.
   * @returns Response emitted by the repo.deleteRecord mutation.
   */
  async unlikePost(likeUri: string, userDid: string) {
    return this.feeds.unlikePost(likeUri, userDid);
  }

  /**
   * Lists the user's conversations including the most recent message and participant metadata.
   * @param limit - Maximum number of conversations to fetch, defaults to 50.
   * @param cursor - Pagination cursor returned from a previous list call.
   * @param readState - Optional filter restricting results to unread conversations.
   * @param status - Optional status filter for request vs accepted conversations.
   * @returns Conversation listing including pagination metadata.
   */
  async listConversations(
    limit: number = 50,
    cursor?: string,
    readState?: 'unread',
    status?: 'request' | 'accepted',
  ): Promise<BlueskyConvosResponse> {
    return this.conversations.listConversations(limit, cursor, readState, status);
  }

  /**
   * Retrieves messages for a specific conversation.
   * @param convoId - Conversation identifier returned by the conversations list endpoint.
   * @param limit - Maximum number of messages to fetch per page, defaults to 50.
   * @param cursor - Pagination cursor used to continue from a previous response.
   * @returns Conversation messages along with pagination metadata.
   */
  async getMessages(convoId: string, limit: number = 50, cursor?: string): Promise<BlueskyMessagesResponse> {
    return this.conversations.getMessages(convoId, limit, cursor);
  }

  /**
   * Sends a direct message in the specified conversation on behalf of the authenticated user.
   * @param convoId - Identifier of the conversation where the message should be delivered.
   * @param message - Message payload containing the textual body.
   * @returns Server response describing the persisted message record.
   */
  async sendMessage(convoId: string, message: BlueskySendMessageInput): Promise<BlueskySendMessageResponse> {
    return this.conversations.sendMessage(convoId, message);
  }

  /**
   * Creates a follow record pointing at the supplied DID.
   * @param did - DID of the actor that should be followed.
   * @returns Response emitted by the repo.createRecord mutation.
   */
  async followUser(did: string) {
    return this.graph.followUser(did);
  }

  /**
   * Deletes an existing follow record, effectively unfollowing the target actor.
   * @param followUri - URI of the follow record to delete.
   * @returns Response emitted by the repo.deleteRecord mutation.
   */
  async unfollowUser(followUri: string) {
    return this.graph.unfollowUser(followUri);
  }

  /**
   * Creates a block record against the supplied DID.
   * @param did - DID of the actor that should be blocked.
   * @returns Response emitted by the repo.createRecord mutation.
   */
  async blockUser(did: string) {
    return this.graph.blockUser(did);
  }

  /**
   * Removes an existing block record, unblocking the target actor.
   * @param blockUri - URI of the block record to delete.
   * @returns Response emitted by the repo.deleteRecord mutation.
   */
  async unblockUser(blockUri: string) {
    return this.graph.unblockUser(blockUri);
  }

  /**
   * Mutes the supplied actor so their posts and notifications are hidden locally.
   * @param actor - DID or handle of the actor that should be muted.
   * @returns Response payload from the graph.muteActor endpoint.
   */
  async muteUser(actor: string) {
    return this.graph.muteUser(actor);
  }

  /**
   * Clears an existing mute on the supplied actor.
   * @param actor - DID or handle of the actor that should be unmuted.
   * @returns Response payload from the graph.unmuteActor endpoint.
   */
  async unmuteUser(actor: string) {
    return this.graph.unmuteUser(actor);
  }

  /**
   * Mutes all members of a Bluesky list for the authenticated user.
   * @param list - AT URI of the list to mute.
   * @returns Response payload from the graph.muteActorList endpoint.
   */
  async muteActorList(list: string) {
    return this.graph.muteActorList(list);
  }

  /**
   * Mutes a thread so future replies no longer surface in the user's notifications.
   * @param root - AT URI of the thread root that should be muted.
   * @returns Response payload from the graph.muteThread endpoint.
   */
  async muteThread(root: string) {
    return this.graph.muteThread(root);
  }

  /**
   * Searches for actors matching the provided query string.
   * @param query - Text query to match against actor handles and display names.
   * @param limit - Maximum number of results to return per page, defaults to 20.
   * @param cursor - Pagination cursor returned by previous search requests.
   * @returns Actor search results with pagination metadata.
   */
  async searchProfiles(query: string, limit: number = 20, cursor?: string): Promise<BlueskySearchActorsResponse> {
    return this.search.searchProfiles(query, limit, cursor);
  }

  /**
   * Searches public posts that match the provided query string.
   * @param query - Text query applied to posts.
   * @param limit - Maximum number of results to return per page, defaults to 20.
   * @param cursor - Pagination cursor returned by previous search requests.
   * @returns Post search results with pagination metadata.
   */
  async searchPosts(query: string, limit: number = 20, cursor?: string): Promise<BlueskySearchPostsResponse> {
    return this.search.searchPosts(query, limit, cursor);
  }

  /**
   * Lists notifications for the authenticated user with optional filtering.
   * @param limit - Maximum number of notifications to fetch per page, defaults to 50.
   * @param cursor - Pagination cursor returned from previous notification requests.
   * @param reasons - Optional filter restricting notifications to specific reasons.
   * @param priority - Optional filter to only return priority notifications.
   * @param seenAt - Optional timestamp used to fetch notifications since a specific moment.
   * @returns Notification listing including pagination metadata.
   */
  async listNotifications(
    limit: number = 50,
    cursor?: string,
    reasons?: string[],
    priority?: boolean,
    seenAt?: string,
  ): Promise<BlueskyNotificationsResponse> {
    return this.notifications.listNotifications(limit, cursor, reasons, priority, seenAt);
  }

  /**
   * Retrieves the total number of unread notifications for the authenticated user.
   * @returns Unread notification counter sourced from the Bluesky API.
   */
  async getUnreadNotificationsCount(): Promise<BlueskyUnreadNotificationCount> {
    return this.notifications.getUnreadCount();
  }

  /**
   * Convenience constructor that mirrors the standard constructor for parity with previous usage.
   * @param pdsUrl - Personal data server URL that hosts the AT Protocol endpoints.
   * @returns Instantiated {@link BlueskyApi} for the supplied PDS.
   */
  static createWithPDS(pdsUrl: string): BlueskyApi {
    return new BlueskyApi(pdsUrl);
  }
}
