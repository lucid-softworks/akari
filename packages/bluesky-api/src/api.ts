import { BlueskyActors } from './actors';
import { BlueskyAuth } from './auth';
import { BlueskyApiClient } from './client';
import { BlueskyConversations } from './conversations';
import { BlueskyDrafts } from './draft';
import { BlueskyFeeds } from './feeds';
import { BlueskyGraph } from './graph';
import {
  BlueskyLeaflet,
  type CreateLeafletDocumentInput,
  type CreateLeafletDocumentResponse,
  type CreateLeafletPublicationInput,
} from './leaflet';
import { BlueskyNotifications } from './notifications';
import { BlueskyRepos } from './repos';
import { BlueskySearch } from './search';
import type {
  BlueskyBookmarksResponse,
  BlueskyConvosResponse,
  BlueskyCreateDraftResponse,
  BlueskyCreatePostInput,
  BlueskyCreatePostResponse,
  CreateReviewInput,
  BlueskyDraft,
  BlueskyFeedGeneratorsResponse,
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyGetDraftsResponse,
  BlueskyLinkatBoardResponse,
  BlueskyMessagesResponse,
  BlueskyNotificationPreferences,
  BlueskyNotificationsResponse,
  BlueskyPostView,
  BlueskyPreference,
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
  private drafts: BlueskyDrafts;
  private feeds: BlueskyFeeds;
  private graph: BlueskyGraph;
  private leaflet: BlueskyLeaflet;
  private notifications: BlueskyNotifications;
  private search: BlueskySearch;
  private repos: BlueskyRepos;

  /**
   * Creates a convenience wrapper around the various Bluesky domain clients while sharing the base PDS URL.
   * @param pdsUrl - Personal data server URL that hosts the AT Protocol endpoints.
   * @param appViewProxyDid - Optional AppView DID. When present, app.bsky.* / chat.bsky.* calls
   *   carry an `atproto-proxy: <did>#bsky_appview` header so the PDS forwards them to the named
   *   AppView. Without it, the PDS routes to its default AppView.
   */
  constructor(pdsUrl: string, appViewProxyDid?: string | null) {
    super(pdsUrl, appViewProxyDid);
    this.actors = new BlueskyActors(pdsUrl, appViewProxyDid);
    this.auth = new BlueskyAuth(pdsUrl, appViewProxyDid);
    this.conversations = new BlueskyConversations(pdsUrl, appViewProxyDid);
    this.drafts = new BlueskyDrafts(pdsUrl, appViewProxyDid);
    this.feeds = new BlueskyFeeds(pdsUrl, appViewProxyDid);
    this.graph = new BlueskyGraph(pdsUrl, appViewProxyDid);
    this.leaflet = new BlueskyLeaflet(pdsUrl, appViewProxyDid);
    this.notifications = new BlueskyNotifications(pdsUrl, appViewProxyDid);
    this.search = new BlueskySearch(pdsUrl, appViewProxyDid);
    this.repos = new BlueskyRepos(pdsUrl, appViewProxyDid);
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

  /** Mints a service-auth JWT scoped to a single audience + lexicon. */
  async getServiceAuth(
    accessJwt: string,
    aud: string,
    lxm: string,
    expSeconds?: number,
  ): Promise<{ token: string }> {
    return this.auth.getServiceAuth(accessJwt, aud, lxm, expSeconds);
  }

  /** Read the current session — handle, did, email, confirmation flags. */
  async getSession(accessJwt: string) {
    return this.auth.getSession(accessJwt);
  }

  /** Update the user's handle. */
  async updateHandle(accessJwt: string, handle: string): Promise<void> {
    return this.auth.updateHandle(accessJwt, handle);
  }

  /** Send a verification token to the user's existing email. */
  async requestEmailUpdate(accessJwt: string) {
    return this.auth.requestEmailUpdate(accessJwt);
  }

  /** Update the user's email address. Token is required when the request endpoint asked for one. */
  async updateEmail(accessJwt: string, email: string, token?: string): Promise<void> {
    return this.auth.updateEmail(accessJwt, email, token);
  }

  /** Kick off a password reset by emailing the user a token. */
  async requestPasswordReset(email: string): Promise<void> {
    return this.auth.requestPasswordReset(email);
  }

  /** Deactivate the account. Pass `deleteAfter` to schedule a hard delete. */
  async deactivateAccount(accessJwt: string, deleteAfter?: string): Promise<void> {
    return this.auth.deactivateAccount(accessJwt, deleteAfter);
  }

  /** Email an account-delete confirmation token. */
  async requestAccountDelete(accessJwt: string): Promise<void> {
    return this.auth.requestAccountDelete(accessJwt);
  }

  /** Permanently delete the account using the emailed token + password. */
  async deleteAccount(did: string, password: string, token: string): Promise<void> {
    return this.auth.deleteAccount(did, password, token);
  }

  /** Download the user's repo as a CAR-format Blob. */
  async exportRepo(accessJwt: string, did: string): Promise<Blob> {
    return this.auth.exportRepo(accessJwt, did);
  }

  /** List the user's app passwords. */
  async listAppPasswords(accessJwt: string) {
    return this.auth.listAppPasswords(accessJwt);
  }

  /** Create a new app password. The plaintext is only returned once. */
  async createAppPassword(accessJwt: string, name: string, privileged = false) {
    return this.auth.createAppPassword(accessJwt, name, privileged);
  }

  /** Revoke an existing app password by display name. */
  async revokeAppPassword(accessJwt: string, name: string): Promise<void> {
    return this.auth.revokeAppPassword(accessJwt, name);
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
   * Overwrites the authenticated user's preference list. Bluesky requires the
   * full preference array on every put — callers should read first, modify
   * the slice they care about, and pass the merged list back.
   */
  async putPreferences(accessJwt: string, preferences: BlueskyPreference[]): Promise<void> {
    return this.actors.putPreferences(accessJwt, preferences);
  }

  /**
   * Resolves labeler service DIDs to detailed views.
   */
  async getLabelerServices(accessJwt: string, dids: string[], detailed = true) {
    return this.actors.getLabelerServices(accessJwt, dids, detailed);
  }

  /**
   * Sets or clears the current user's pinned post.
   */
  async setPinnedPost(
    accessJwt: string,
    userDid: string,
    pinned: { uri: string; cid: string } | null,
  ) {
    return this.actors.setPinnedPost(accessJwt, userDid, pinned);
  }

  /** Read the current user's `app.bsky.actor.profile/self` record. */
  async getProfileRecord(accessJwt: string, userDid: string) {
    return this.actors.getProfileRecord(accessJwt, userDid);
  }

  /** Toggle the `!no-unauthenticated` self-label on the user's profile. */
  async setLoggedOutVisibilityDiscouraged(
    accessJwt: string,
    userDid: string,
    discouraged: boolean,
  ) {
    return this.actors.setLoggedOutVisibilityDiscouraged(accessJwt, userDid, discouraged);
  }

  /** Toggle the `automated` self-label on the user's profile. */
  async setAccountAutomated(accessJwt: string, userDid: string, automated: boolean) {
    return this.actors.setAccountAutomated(accessJwt, userDid, automated);
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
   * Adds a post to the authenticated user's bookmarks.
   * @param accessJwt - Valid session token for the requesting user.
   * @param uri - AT URI of the post to bookmark.
   * @param cid - CID of the post to bookmark.
   */
  async createBookmark(accessJwt: string, uri: string, cid: string): Promise<void> {
    return this.feeds.createBookmark(accessJwt, uri, cid);
  }

  /**
   * Removes a post from the authenticated user's bookmarks.
   * @param accessJwt - Valid session token for the requesting user.
   * @param uri - AT URI of the post to remove from bookmarks.
   */
  async deleteBookmark(accessJwt: string, uri: string): Promise<void> {
    return this.feeds.deleteBookmark(accessJwt, uri);
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

  async setThreadgate(
    accessJwt: string,
    userDid: string,
    postUri: string,
    allow: Parameters<typeof this.feeds.setThreadgate>[3],
  ) {
    return this.feeds.setThreadgate(accessJwt, userDid, postUri, allow);
  }

  async setPostgate(
    accessJwt: string,
    userDid: string,
    postUri: string,
    options: { allowQuote: boolean },
  ) {
    return this.feeds.setPostgate(accessJwt, userDid, postUri, options);
  }

  /**
   * Creates a review record in the social.popfeed.feed.review collection.
   * @param accessJwt - Valid session token authorised to create records for the provided DID.
   * @param userDid - DID of the repository where the review should be recorded.
   * @param review - Review data including identifiers, rating, and optional metadata.
   * @returns Metadata for the created record including AT URI and commit details.
   */
  async createReview(accessJwt: string, userDid: string, review: CreateReviewInput): Promise<BlueskyCreatePostResponse> {
    return this.repos.createReview(accessJwt, userDid, review);
  }

  /** Reads the user's `community.lexicon.preference.ai` record (or null). */
  async getAiPreferences(accessJwt: string, userDid: string) {
    return this.repos.getAiPreferences(accessJwt, userDid);
  }

  /** Writes the user's AI preferences record (replaces, not merges). */
  async putAiPreferences(
    accessJwt: string,
    userDid: string,
    record: import('./repos').AiPreferencesRecord,
  ) {
    return this.repos.putAiPreferences(accessJwt, userDid, record);
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

  async repostPost(accessJwt: string, postUri: string, postCid: string, userDid: string) {
    return this.feeds.repostPost(accessJwt, postUri, postCid, userDid);
  }

  async unrepostPost(accessJwt: string, repostUri: string, userDid: string) {
    return this.feeds.unrepostPost(accessJwt, repostUri, userDid);
  }

  async createReport(
    accessJwt: string,
    subject: { did: string } | { uri: string; cid: string },
    reasonType: string,
    reason?: string,
    labelerDid?: string,
  ) {
    return this.feeds.createReport(accessJwt, subject, reasonType, reason, labelerDid);
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

  async markConversationRead(accessJwt: string, convoId: string): Promise<void> {
    return this.conversations.updateRead(accessJwt, convoId);
  }

  /**
   * Resolves (or creates) the conversation for a set of member DIDs.
   * Pass the peers' DIDs only — the current user is implicit.
   */
  async getConvoForMembers(accessJwt: string, members: string[]) {
    return this.conversations.getConvoForMembers(accessJwt, members);
  }

  /**
   * Fetches a single conversation by its id.
   */
  async getConvo(accessJwt: string, convoId: string) {
    return this.conversations.getConvo(accessJwt, convoId);
  }

  /**
   * Leaves a conversation.
   */
  async leaveConvo(accessJwt: string, convoId: string) {
    return this.conversations.leaveConvo(accessJwt, convoId);
  }

  /**
   * Adds members to a group conversation.
   */
  async addConvoMembers(accessJwt: string, convoId: string, dids: string[]) {
    return this.conversations.addMembers(accessJwt, convoId, dids);
  }

  /**
   * Removes members from a group conversation.
   */
  async removeConvoMembers(accessJwt: string, convoId: string, dids: string[]) {
    return this.conversations.removeMembers(accessJwt, convoId, dids);
  }

  /**
   * Renames a group conversation.
   */
  async updateConvoName(accessJwt: string, convoId: string, name: string) {
    return this.conversations.updateConvoName(accessJwt, convoId, name);
  }

  /**
   * Mutes a conversation.
   */
  async muteConvo(accessJwt: string, convoId: string) {
    return this.conversations.muteConvo(accessJwt, convoId);
  }

  /**
   * Unmutes a conversation.
   */
  async unmuteConvo(accessJwt: string, convoId: string) {
    return this.conversations.unmuteConvo(accessJwt, convoId);
  }

  /**
   * Adds an emoji reaction to a message.
   */
  async addReaction(accessJwt: string, convoId: string, messageId: string, value: string) {
    return this.conversations.addReaction(accessJwt, convoId, messageId, value);
  }

  /**
   * Removes an emoji reaction from a message.
   */
  async removeReaction(accessJwt: string, convoId: string, messageId: string, value: string) {
    return this.conversations.removeReaction(accessJwt, convoId, messageId, value);
  }

  /**
   * Creates a follow record pointing at the supplied DID.
   * @param accessJwt - Valid session token for the actor initiating the follow.
   * @param did - DID of the actor that should be followed.
   * @returns Response emitted by the repo.createRecord mutation.
   */
  async followUser(accessJwt: string, userDid: string, did: string) {
    return this.graph.followUser(accessJwt, userDid, did);
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
  async blockUser(accessJwt: string, userDid: string, did: string) {
    return this.graph.blockUser(accessJwt, userDid, did);
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

  /** Unmute a previously-muted actor list. */
  async unmuteActorList(accessJwt: string, list: string) {
    return this.graph.unmuteActorList(accessJwt, list);
  }

  /** Subscribe-as-block to an actor list (creates a `listblock` record). */
  async blockActorList(accessJwt: string, userDid: string, list: string) {
    return this.graph.blockActorList(accessJwt, userDid, list);
  }

  /** Delete the `listblock` record returned by `viewer.blocked`. */
  async unblockActorList(accessJwt: string, listblockUri: string) {
    return this.graph.unblockActorList(accessJwt, listblockUri);
  }

  /** Fetch the viewer's muted accounts. */
  async getMutes(accessJwt: string, limit = 50, cursor?: string) {
    return this.graph.getMutes(accessJwt, limit, cursor);
  }

  /** Fetch the viewer's blocked accounts. */
  async getBlocks(accessJwt: string, limit = 50, cursor?: string) {
    return this.graph.getBlocks(accessJwt, limit, cursor);
  }

  /** Fetch the viewer's muted moderation lists. */
  async getListMutes(accessJwt: string, limit = 50, cursor?: string) {
    return this.graph.getListMutes(accessJwt, limit, cursor);
  }

  /** Fetch the viewer's blocked moderation lists. */
  async getListBlocks(accessJwt: string, limit = 50, cursor?: string) {
    return this.graph.getListBlocks(accessJwt, limit, cursor);
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

  async unmuteThread(accessJwt: string, root: string) {
    return this.graph.unmuteThread(accessJwt, root);
  }

  /**
   * Forwards per-item interaction events to a feed generator's service
   * via the appview. Used for "show more/less like this".
   */
  async sendInteractions(
    accessJwt: string,
    feedGenDid: string,
    interactions: { event: string; item: string; feedContext?: string }[],
  ) {
    return this.feeds.sendInteractions(accessJwt, feedGenDid, interactions);
  }

  async getLists(accessJwt: string, actor: string, limit?: number, cursor?: string) {
    return this.graph.getLists(accessJwt, actor, limit, cursor);
  }

  async getList(accessJwt: string, list: string, limit?: number, cursor?: string) {
    return this.graph.getList(accessJwt, list, limit, cursor);
  }

  async createList(
    accessJwt: string,
    userDid: string,
    input: { name: string; purpose: string; description?: string },
  ) {
    return this.graph.createList(accessJwt, userDid, input);
  }

  async addToList(accessJwt: string, userDid: string, listUri: string, subjectDid: string) {
    return this.graph.addToList(accessJwt, userDid, listUri, subjectDid);
  }

  async removeFromList(accessJwt: string, listItemUri: string) {
    return this.graph.removeFromList(accessJwt, listItemUri);
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
    sort?: "top" | "latest",
  ): Promise<BlueskySearchPostsResponse> {
    return this.search.searchPosts(accessJwt, query, limit, cursor, sort);
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

  async markNotificationsSeen(accessJwt: string): Promise<void> {
    return this.notifications.updateSeen(accessJwt);
  }

  /** Read the user's per-category notification preferences. */
  async getNotificationPreferences(accessJwt: string) {
    return this.notifications.getNotificationPreferences(accessJwt);
  }

  /** Write per-category notification preferences via the v2 endpoint. */
  async putNotificationPreferencesV2(
    accessJwt: string,
    prefs: BlueskyNotificationPreferences,
  ): Promise<void> {
    return this.notifications.putNotificationPreferencesV2(accessJwt, prefs);
  }

  /** Lists composer drafts stored in the user's private stash. */
  async getDrafts(
    accessJwt: string,
    options: { limit?: number; cursor?: string } = {},
  ): Promise<BlueskyGetDraftsResponse> {
    return this.drafts.getDrafts(accessJwt, options);
  }

  /** Creates a new composer draft. May throw `DraftLimitReached`. */
  async createDraft(
    accessJwt: string,
    draft: BlueskyDraft,
  ): Promise<BlueskyCreateDraftResponse> {
    return this.drafts.createDraft(accessJwt, draft);
  }

  /** Updates an existing draft (no-op if id is unknown server-side). */
  async updateDraft(accessJwt: string, id: string, draft: BlueskyDraft): Promise<void> {
    return this.drafts.updateDraft(accessJwt, id, draft);
  }

  async deleteDraft(accessJwt: string, id: string): Promise<void> {
    return this.drafts.deleteDraft(accessJwt, id);
  }

  /**
   * Returns the user's first existing `pub.leaflet.publication` record,
   * creating one with the supplied defaults if they don't have any yet.
   */
  async findOrCreateLeafletPublication(
    accessJwt: string,
    userDid: string,
    defaults: CreateLeafletPublicationInput,
  ): Promise<{ uri: string; cid: string; rkey: string }> {
    return this.leaflet.findOrCreatePublication(accessJwt, userDid, defaults);
  }

  /** Creates a `pub.leaflet.document` under an existing publication. */
  async createLeafletDocument(
    accessJwt: string,
    userDid: string,
    input: CreateLeafletDocumentInput,
  ): Promise<CreateLeafletDocumentResponse> {
    return this.leaflet.createDocument(accessJwt, userDid, input);
  }

  /**
   * Convenience constructor that mirrors the standard constructor for parity with previous usage.
   * @param pdsUrl - Personal data server URL that hosts the AT Protocol endpoints.
   * @param appViewProxyDid - See {@link BlueskyApi} constructor.
   * @returns Instantiated {@link BlueskyApi} for the supplied PDS.
   */
  static createWithPDS(pdsUrl: string, appViewProxyDid?: string | null): BlueskyApi {
    return new BlueskyApi(pdsUrl, appViewProxyDid);
  }
}
