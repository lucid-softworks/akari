import { BlueskyActors } from './actors';
import { BlueskyAuth } from './auth';
import { BlueskyApiClient } from './client';
import { BlueskyConversations } from './conversations';
import { BlueskyFeeds } from './feeds';
import { BlueskyGraph } from './graph';
import { BlueskyNotifications } from './notifications';
import { BlueskyRepos } from './repos';
import { BlueskySearch } from './search';
import type {
  BlueskyBookmarksResponse,
  BlueskyConvosResponse,
  BlueskyCreatePostInput,
  BlueskyCreatePostResponse,
  BlueskyFeedGeneratorsResponse,
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyLinkatBoardResponse,
  BlueskyMessagesResponse,
  BlueskyNotificationsResponse,
  BlueskyPostView,
  BlueskyPreferencesResponse,
  BlueskyProfileResponse,
  BlueskyProfileUpdateInput,
  BlueskyRecipeRecordsResponse,
  BlueskySearchActorsResponse,
  BlueskySearchPostsResponse,
  BlueskySendMessageInput,
  BlueskySendMessageResponse,
  BlueskySession,
  BlueskyStarterPacksResponse,
  BlueskyTangledReposResponse,
  BlueskyThreadResponse,
  BlueskyTrendingTopicsResponse,
  BlueskyUnreadNotificationCount,
  BlueskyUploadBlobResponse,
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
  private repos: BlueskyRepos;

  /**
   * Creates a convenience wrapper around the various Bluesky domain clients while sharing the base PDS URL.
   * @param pdsUrl - Personal data server URL that hosts the AT Protocol endpoints.
   */
  constructor(pdsUrl: string) {
    super(pdsUrl);
    this.actors = new BlueskyActors(pdsUrl);
    this.auth = new BlueskyAuth(pdsUrl);
    this.conversations = new BlueskyConversations(pdsUrl);
    this.feeds = new BlueskyFeeds(pdsUrl);
    this.graph = new BlueskyGraph(pdsUrl);
    this.notifications = new BlueskyNotifications(pdsUrl);
    this.search = new BlueskySearch(pdsUrl);
    this.repos = new BlueskyRepos(pdsUrl);
  }

  /**
   * Creates an authenticated session for the supplied handle or DID using the user's password.
   * @param identifier - Handle or DID that should be authenticated.
   * @param password - Account password used to obtain the session tokens.
   * @returns Newly created session tokens for the account.
   */
  async createSession(identifier: string, password: string): Promise<BlueskySession> {
    return this.auth.createSession(identifier, password);
  }

  /**
   * Exchanges a refresh token for a new authenticated session.
   * @param refreshJwt - Refresh JWT provided by Bluesky during the original session creation.
   * @returns Fresh access and refresh token pair from the PDS.
   */
  async refreshSession(refreshJwt: string): Promise<BlueskySession> {
    return this.auth.refreshSession(refreshJwt);
  }

  /**
   * Loads profile metadata and viewer state for the requested DID.
   * @param accessJwt - Valid session token used to authorise the profile lookup.
   * @param did - DID of the actor whose profile information should be retrieved.
   * @returns Profile record and viewer relationship metadata.
   */
  async getProfile(accessJwt: string, did: string): Promise<BlueskyProfileResponse> {
    return this.actors.getProfile(accessJwt, did);
  }

  /**
   * Updates profile metadata such as display name, description, avatar or banner in the actor record.
   * @param accessJwt - Valid session token authorised to modify the actor profile.
   * @param profileData - Partial profile fields that should be persisted for the actor.
   * @returns Updated profile record returned by Bluesky after the mutation.
   */
  async updateProfile(accessJwt: string, profileData: BlueskyProfileUpdateInput): Promise<BlueskyProfileResponse> {
    return this.actors.updateProfile(accessJwt, profileData);
  }

  /**
   * Retrieves the authenticated user's current preference records, including saved feeds and content filters.
   * @param accessJwt - Valid session token for the actor whose preferences are requested.
   * @returns Preference collection describing feed pinning and label settings.
   */
  async getPreferences(accessJwt: string): Promise<BlueskyPreferencesResponse> {
    return this.actors.getPreferences(accessJwt);
  }

  /**
   * Lists Tangled repos created by the requested actor.
   * @param accessJwt - Valid session token authorised to query the actor's records.
   * @param actor - DID or handle identifying the actor whose repos should be loaded.
   * @param limit - Maximum number of repos to fetch per page, defaults to 50.
   * @param cursor - Pagination cursor from previous responses, if any.
   * @returns Tangled repo records created by the actor.
   */
  async getActorRepos(
    accessJwt: string,
    actor: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyTangledReposResponse> {
    return this.repos.getActorRepos(accessJwt, actor, limit, cursor);
  }

  /**
   * Lists recipe records created by the requested actor.
   * @param accessJwt - Valid session token authorised to query the actor's records.
   * @param actor - DID or handle identifying the actor whose recipes should be loaded.
   * @param limit - Maximum number of recipes to fetch per page, defaults to 50.
   * @param cursor - Pagination cursor from previous responses, if any.
   * @returns Recipe records created by the actor.
   */
  async getActorRecipes(
    accessJwt: string,
    actor: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyRecipeRecordsResponse> {
    return this.repos.getActorRecipes(accessJwt, actor, limit, cursor);
  }

  /**
   * Fetches Blue.linkat.board records for the specified actor.
   * @param accessJwt - Valid session token for the requesting user.
   * @param actor - DID or handle identifying the actor whose link boards should be loaded.
   * @param limit - Number of records to fetch per page, defaults to 50.
   * @param cursor - Optional pagination cursor returned by previous calls.
   * @returns Blue.linkat.board records for the actor.
   */
  async getActorLinkatBoards(
    accessJwt: string,
    actor: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyLinkatBoardResponse> {
    return this.repos.getActorLinkatBoards(accessJwt, actor, limit, cursor);
  }

  /**
   * Fetches the home timeline feed for the authenticated user.
   * @param accessJwt - Valid session token for the requesting user.
   * @param limit - Maximum number of feed items to return, defaults to 20.
   * @returns Feed page that mirrors the app.bsky.feed.getTimeline endpoint.
   */
  async getTimeline(accessJwt: string, limit: number = 20): Promise<BlueskyFeedResponse> {
    return this.feeds.getTimeline(accessJwt, limit);
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
   * @param accessJwt - Valid session token to access the feed generator listing.
   * @param actor - DID or handle identifying the actor whose feeds should be loaded.
   * @param limit - Maximum number of feeds to fetch per page, defaults to 50.
   * @param cursor - Pagination cursor returned from previous requests.
   * @returns Feed generator metadata for the provided actor.
   */
  async getFeeds(accessJwt: string, actor: string, limit: number = 50, cursor?: string): Promise<BlueskyFeedsResponse> {
    return this.feeds.getFeeds(accessJwt, actor, limit, cursor);
  }

  /**
   * Fetches posts produced by a feed generator.
   * @param accessJwt - Valid session token to authorise the feed request.
   * @param feed - AT URI of the feed generator to read.
   * @param limit - Maximum number of posts to request, defaults to 50.
   * @param cursor - Pagination cursor returned by the API, if available.
   * @returns Feed slice containing posts created by the generator.
   */
  async getFeed(accessJwt: string, feed: string, limit: number = 50, cursor?: string): Promise<BlueskyFeedResponse> {
    return this.feeds.getFeed(accessJwt, feed, limit, cursor);
  }

  /**
   * Resolves metadata for an array of feed generator URIs.
   * @param accessJwt - Valid session token to authorise the metadata request.
   * @param feeds - List of feed generator URIs that should be described.
   * @returns Collection of feed generator descriptions keyed by Bluesky.
   */
  async getFeedGenerators(accessJwt: string, feeds: string[]): Promise<BlueskyFeedGeneratorsResponse> {
    return this.feeds.getFeedGenerators(accessJwt, feeds);
  }

  /**
   * Lists the authenticated user's bookmarked posts.
   * @param accessJwt - Valid session token for the requesting user.
   * @param limit - Maximum number of bookmarks to fetch per page, defaults to 50.
   * @param cursor - Pagination cursor from the previous response, if any.
   * @returns Paginated bookmark feed from the app.bsky.bookmark namespace.
   */
  async getBookmarks(accessJwt: string, limit: number = 50, cursor?: string): Promise<BlueskyBookmarksResponse> {
    return this.feeds.getBookmarks(accessJwt, limit, cursor);
  }

  /**
   * Loads a single post view by its AT URI, guaranteeing the post exists before returning it.
   * @param accessJwt - Valid session token used to look up the post.
   * @param uri - AT URI of the post to fetch.
   * @returns Post view containing record data, embeds and viewer state.
   */
  async getPost(accessJwt: string, uri: string): Promise<BlueskyPostView> {
    return this.feeds.getPost(accessJwt, uri);
  }

  /**
   * Fetches a full thread for a given post including replies and parent context.
   * @param accessJwt - Valid session token used to authorise the request.
   * @param uri - AT URI of the root post to expand.
   * @returns Thread response mirroring the feed.getPostThread endpoint.
   */
  async getPostThread(accessJwt: string, uri: string): Promise<BlueskyThreadResponse> {
    return this.feeds.getPostThread(accessJwt, uri);
  }

  /**
   * Retrieves an author's posts with optional filtering for replies, media or thread starters.
   * @param accessJwt - Valid session token to authorise the author feed lookup.
   * @param actor - DID or handle identifying the author.
   * @param limit - Maximum number of posts to fetch per page, defaults to 20.
   * @param cursor - Pagination cursor from the previous author feed response.
   * @param filter - Optional server-side filter for replies, media, or author threads.
   * @returns Paginated feed slice scoped to the author's posts.
   */
  async getAuthorFeed(
    accessJwt: string,
    actor: string,
    limit: number = 20,
    cursor?: string,
    filter?: 'posts_with_replies' | 'posts_no_replies' | 'posts_with_media' | 'posts_and_author_threads',
  ): Promise<BlueskyFeedResponse> {
    return this.feeds.getAuthorFeed(accessJwt, actor, limit, cursor, filter);
  }

  /**
   * Retrieves an author's posts filtered to entries containing uploaded video.
   * @param accessJwt - Valid session token to authorise the request.
   * @param actor - DID or handle representing the author.
   * @param limit - Maximum number of posts to request, defaults to 20.
   * @param cursor - Optional pagination cursor from the API.
   * @returns Feed page containing only posts with video embeds.
   */
  async getAuthorVideos(
    accessJwt: string,
    actor: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<BlueskyFeedResponse> {
    return this.feeds.getAuthorVideos(accessJwt, actor, limit, cursor);
  }

  /**
   * Lists feed generators owned by an actor, mirroring getFeeds but scoped to author-owned resources.
   * @param accessJwt - Valid session token to authorise the listing.
   * @param actor - DID or handle representing the author.
   * @param limit - Maximum number of feed generators per page, defaults to 50.
   * @param cursor - Pagination cursor from the previous response, if present.
   * @returns Feed generator list for the supplied actor.
   */
  async getAuthorFeeds(
    accessJwt: string,
    actor: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyFeedsResponse> {
    return this.feeds.getAuthorFeeds(accessJwt, actor, limit, cursor);
  }

  /**
   * Retrieves starter packs curated by an author that bundle suggested follows and feeds.
   * @param accessJwt - Valid session token to authorise the starter pack lookup.
   * @param actor - DID or handle whose starter packs should be returned.
   * @param limit - Maximum number of starter packs per page, defaults to 50.
   * @param cursor - Pagination cursor from previous starter pack responses.
   * @returns Paginated list of starter packs authored by the given actor.
   */
  async getAuthorStarterpacks(
    accessJwt: string,
    actor: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyStarterPacksResponse> {
    return this.feeds.getAuthorStarterpacks(accessJwt, actor, limit, cursor);
  }

  /**
   * Creates a new post on behalf of the authenticated user including optional reply context and media embeds.
   * @param accessJwt - Valid session token authorised to create posts for the provided DID.
   * @param userDid - DID of the repository where the post should be recorded.
   * @param post - Text, reply references and media attachments to persist in the record.
   * @returns Metadata for the created record including AT URI and commit details.
   */
  async createPost(accessJwt: string, userDid: string, post: BlueskyCreatePostInput): Promise<BlueskyCreatePostResponse> {
    return this.feeds.createPost(accessJwt, userDid, post);
  }

  /**
   * Uploads a binary blob (image or GIF) to Bluesky and returns the blob reference for embedding.
   * @param accessJwt - Valid session token authorised to upload media.
   * @param imageUri - Local URI that should be fetched and uploaded as a blob.
   * @param mimeType - MIME type associated with the uploaded media.
   * @returns Blob reference structure compatible with Bluesky embed records.
   */
  async uploadImage(accessJwt: string, imageUri: string, mimeType: string): Promise<BlueskyUploadBlobResponse> {
    return this.feeds.uploadImage(accessJwt, imageUri, mimeType);
  }

  /**
   * Creates a like record for the specified post in the authenticated user's repository.
   * @param accessJwt - Valid session token authorised to mutate the repository.
   * @param postUri - AT URI of the post that should be liked.
   * @param postCid - CID of the post being liked, required by the repo mutation.
   * @param userDid - DID of the repository owner creating the like record.
   * @returns Response emitted by the repo.createRecord mutation.
   */
  async likePost(accessJwt: string, postUri: string, postCid: string, userDid: string) {
    return this.feeds.likePost(accessJwt, postUri, postCid, userDid);
  }

  /**
   * Removes an existing like record from the authenticated user's repository.
   * @param accessJwt - Valid session token authorised to mutate the repository.
   * @param likeUri - URI of the like record to delete.
   * @param userDid - DID of the repository owner removing the like record.
   * @returns Response emitted by the repo.deleteRecord mutation.
   */
  async unlikePost(accessJwt: string, likeUri: string, userDid: string) {
    return this.feeds.unlikePost(accessJwt, likeUri, userDid);
  }

  /**
   * Lists the user's conversations including the most recent message and participant metadata.
   * @param accessJwt - Valid session token authorised to read conversation state.
   * @param limit - Maximum number of conversations to fetch, defaults to 50.
   * @param cursor - Pagination cursor returned from a previous list call.
   * @param readState - Optional filter restricting results to unread conversations.
   * @param status - Optional status filter for request vs accepted conversations.
   * @returns Conversation listing including pagination metadata.
   */
  async listConversations(
    accessJwt: string,
    limit: number = 50,
    cursor?: string,
    readState?: 'unread',
    status?: 'request' | 'accepted',
  ): Promise<BlueskyConvosResponse> {
    return this.conversations.listConversations(accessJwt, limit, cursor, readState, status);
  }

  /**
   * Retrieves messages for a specific conversation.
   * @param accessJwt - Valid session token authorised to read the conversation contents.
   * @param convoId - Conversation identifier returned by the conversations list endpoint.
   * @param limit - Maximum number of messages to fetch per page, defaults to 50.
   * @param cursor - Pagination cursor used to continue from a previous response.
   * @returns Conversation messages along with pagination metadata.
   */
  async getMessages(
    accessJwt: string,
    convoId: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<BlueskyMessagesResponse> {
    return this.conversations.getMessages(accessJwt, convoId, limit, cursor);
  }

  /**
   * Sends a direct message in the specified conversation on behalf of the authenticated user.
   * @param accessJwt - Valid session token authorised to post to the conversation.
   * @param convoId - Identifier of the conversation where the message should be delivered.
   * @param message - Message payload containing the textual body.
   * @returns Server response describing the persisted message record.
   */
  async sendMessage(
    accessJwt: string,
    convoId: string,
    message: BlueskySendMessageInput,
  ): Promise<BlueskySendMessageResponse> {
    return this.conversations.sendMessage(accessJwt, convoId, message);
  }

  /**
   * Creates a follow record pointing at the supplied DID.
   * @param accessJwt - Valid session token for the actor initiating the follow.
   * @param did - DID of the actor that should be followed.
   * @returns Response emitted by the repo.createRecord mutation.
   */
  async followUser(accessJwt: string, did: string) {
    return this.graph.followUser(accessJwt, did);
  }

  /**
   * Deletes an existing follow record, effectively unfollowing the target actor.
   * @param accessJwt - Valid session token for the actor removing the follow.
   * @param followUri - URI of the follow record to delete.
   * @returns Response emitted by the repo.deleteRecord mutation.
   */
  async unfollowUser(accessJwt: string, followUri: string) {
    return this.graph.unfollowUser(accessJwt, followUri);
  }

  /**
   * Creates a block record against the supplied DID.
   * @param accessJwt - Valid session token for the actor initiating the block.
   * @param did - DID of the actor that should be blocked.
   * @returns Response emitted by the repo.createRecord mutation.
   */
  async blockUser(accessJwt: string, did: string) {
    return this.graph.blockUser(accessJwt, did);
  }

  /**
   * Removes an existing block record, unblocking the target actor.
   * @param accessJwt - Valid session token for the actor clearing the block.
   * @param blockUri - URI of the block record to delete.
   * @returns Response emitted by the repo.deleteRecord mutation.
   */
  async unblockUser(accessJwt: string, blockUri: string) {
    return this.graph.unblockUser(accessJwt, blockUri);
  }

  /**
   * Mutes the supplied actor so their posts and notifications are hidden locally.
   * @param accessJwt - Valid session token for the actor applying the mute.
   * @param actor - DID or handle of the actor that should be muted.
   * @returns Response payload from the graph.muteActor endpoint.
   */
  async muteUser(accessJwt: string, actor: string) {
    return this.graph.muteUser(accessJwt, actor);
  }

  /**
   * Clears an existing mute on the supplied actor.
   * @param accessJwt - Valid session token for the actor removing the mute.
   * @param actor - DID or handle of the actor that should be unmuted.
   * @returns Response payload from the graph.unmuteActor endpoint.
   */
  async unmuteUser(accessJwt: string, actor: string) {
    return this.graph.unmuteUser(accessJwt, actor);
  }

  /**
   * Mutes all members of a Bluesky list for the authenticated user.
   * @param accessJwt - Valid session token for the actor applying the mute list.
   * @param list - AT URI of the list to mute.
   * @returns Response payload from the graph.muteActorList endpoint.
   */
  async muteActorList(accessJwt: string, list: string) {
    return this.graph.muteActorList(accessJwt, list);
  }

  /**
   * Mutes a thread so future replies no longer surface in the user's notifications.
   * @param accessJwt - Valid session token for the actor muting the thread.
   * @param root - AT URI of the thread root that should be muted.
   * @returns Response payload from the graph.muteThread endpoint.
   */
  async muteThread(accessJwt: string, root: string) {
    return this.graph.muteThread(accessJwt, root);
  }

  /**
   * Searches for actors matching the provided query string.
   * @param accessJwt - Valid session token used to authorise the search request.
   * @param query - Text query to match against actor handles and display names.
   * @param limit - Maximum number of results to return per page, defaults to 20.
   * @param cursor - Pagination cursor returned by previous search requests.
   * @returns Actor search results with pagination metadata.
   */
  async searchProfiles(
    accessJwt: string,
    query: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<BlueskySearchActorsResponse> {
    return this.search.searchProfiles(accessJwt, query, limit, cursor);
  }

  /**
   * Searches public posts that match the provided query string.
   * @param accessJwt - Valid session token used to authorise the search request.
   * @param query - Text query applied to posts.
   * @param limit - Maximum number of results to return per page, defaults to 20.
   * @param cursor - Pagination cursor returned by previous search requests.
   * @returns Post search results with pagination metadata.
   */
  async searchPosts(
    accessJwt: string,
    query: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<BlueskySearchPostsResponse> {
    return this.search.searchPosts(accessJwt, query, limit, cursor);
  }

  /**
   * Lists notifications for the authenticated user with optional filtering.
   * @param accessJwt - Valid session token authorised to read notifications.
   * @param limit - Maximum number of notifications to fetch per page, defaults to 50.
   * @param cursor - Pagination cursor returned from previous notification requests.
   * @param reasons - Optional filter restricting notifications to specific reasons.
   * @param priority - Optional filter to only return priority notifications.
   * @param seenAt - Optional timestamp used to fetch notifications since a specific moment.
   * @returns Notification listing including pagination metadata.
   */
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

  /**
   * Retrieves the total number of unread notifications for the authenticated user.
   * @param accessJwt - Valid session token authorised to read the notification counts.
   * @returns Unread notification counter sourced from the Bluesky API.
   */
  async getUnreadNotificationsCount(accessJwt: string): Promise<BlueskyUnreadNotificationCount> {
    return this.notifications.getUnreadCount(accessJwt);
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
