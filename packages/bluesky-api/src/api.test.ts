import { BlueskyApi } from './api';
import type {
  BlueskyBookmarksResponse,
  BlueskyConvosResponse,
  BlueskyFeedGeneratorsResponse,
  BlueskyFeedResponse,
  BlueskyFeedsResponse,
  BlueskyMessagesResponse,
  BlueskyNotificationsResponse,
  BlueskyPreferencesResponse,
  BlueskyProfileResponse,
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
  BlueskyPostView,
  BlueskyCreatePostInput,
  BlueskyCreatePostResponse,
} from './types';

const createSession = (overrides: Partial<BlueskySession> = {}): BlueskySession =>
  ({
    handle: 'user.test',
    did: 'did:plc:123',
    active: true,
    accessJwt: 'jwt',
    refreshJwt: 'refresh',
    ...overrides,
  } as BlueskySession);

describe('BlueskyApi', () => {
  const setupApi = () => {
    const api = new BlueskyApi('https://pds.example');
    const internal = api as unknown as {
      auth: Record<string, jest.Mock>;
      actors: Record<string, jest.Mock>;
      feeds: Record<string, jest.Mock>;
      conversations: Record<string, jest.Mock>;
      graph: Record<string, jest.Mock>;
      search: Record<string, jest.Mock>;
      notifications: Record<string, jest.Mock>;
    };

    return { api, internal };
  };

  it('delegates authentication operations to the auth client', async () => {
    const { api, internal } = setupApi();
    const session: BlueskySession = {
      did: 'did:example:alice',
      handle: 'alice.test',
      active: true,
      accessJwt: 'access',
      refreshJwt: 'refresh',
    };
    const refreshed: BlueskySession = {
      ...session,
      accessJwt: 'new-access',
    };

    internal.auth = {
      createSession: jest.fn().mockResolvedValue(session),
      refreshSession: jest.fn().mockResolvedValue(refreshed),
    };

    await expect(api.createSession('alice.test', 'password')).resolves.toBe(session);
    expect(api.getSession()).toBe(session);

    await expect(api.refreshSession()).resolves.toBe(refreshed);

    expect(internal.auth.createSession).toHaveBeenCalledWith('alice.test', 'password');
    expect(internal.auth.refreshSession).toHaveBeenCalledWith('refresh');
    expect(api.getSession()).toBe(refreshed);
  });

  it('forwards actor requests to the actors client', async () => {
    const { api, internal } = setupApi();
    const profile = { handle: 'alice.test' } as unknown as BlueskyProfileResponse;
    const preferences = { preferences: [] } as BlueskyPreferencesResponse;

    internal.actors = {
      getProfile: jest.fn().mockResolvedValue(profile),
      updateProfile: jest.fn().mockResolvedValue(profile),
      getPreferences: jest.fn().mockResolvedValue(preferences),
    };

    const session = createSession();
    api.setSession(session);

    await expect(api.getProfile('did:example:alice')).resolves.toBe(profile);
    await expect(api.updateProfile({ displayName: 'Alice' })).resolves.toBe(profile);
    await expect(api.getPreferences()).resolves.toBe(preferences);

    expect(internal.actors.getProfile).toHaveBeenCalledWith('did:example:alice');
    expect(internal.actors.updateProfile).toHaveBeenCalledWith({ displayName: 'Alice' });
    expect(internal.actors.getPreferences).toHaveBeenCalledWith();
  });

  it('routes feed operations to the feeds client', async () => {
    const { api, internal } = setupApi();
    const feed = { feed: [] } as unknown as BlueskyFeedResponse;
    const trending = { topics: [] } as unknown as BlueskyTrendingTopicsResponse;
    const feedsResponse = { feeds: [] } as unknown as BlueskyFeedsResponse;
    const feedGenerators = { feeds: [] } as unknown as BlueskyFeedGeneratorsResponse;
    const bookmarks = { bookmarks: [] } as unknown as BlueskyBookmarksResponse;
    const post = { uri: 'at://post/1' } as unknown as BlueskyPostView;
    const thread = { thread: {} } as unknown as BlueskyThreadResponse;
    const starterpacks = { starterPacks: [] } as unknown as BlueskyStarterPacksResponse;
    const blob = { blob: { ref: { $link: 'ref' }, mimeType: 'image/png', size: 1 } } as BlueskyUploadBlobResponse;
    const postInput: BlueskyCreatePostInput = { text: 'Hello' };
    const postResponse = { uri: 'at://post/1', cid: 'cid', commit: { cid: 'cid', rev: 'rev' }, validationStatus: 'valid' } as BlueskyCreatePostResponse;

    internal.feeds = {
      getTimeline: jest.fn().mockResolvedValue(feed),
      getTrendingTopics: jest.fn().mockResolvedValue(trending),
      getFeeds: jest.fn().mockResolvedValue(feedsResponse),
      getFeed: jest.fn().mockResolvedValue(feed),
      getFeedGenerators: jest.fn().mockResolvedValue(feedGenerators),
      getBookmarks: jest.fn().mockResolvedValue(bookmarks),
      getPost: jest.fn().mockResolvedValue(post),
      getPostThread: jest.fn().mockResolvedValue(thread),
      getAuthorFeed: jest.fn().mockResolvedValue(feed),
      getAuthorVideos: jest.fn().mockResolvedValue(feed),
      getAuthorFeeds: jest.fn().mockResolvedValue(feedsResponse),
      getAuthorStarterpacks: jest.fn().mockResolvedValue(starterpacks),
      createPost: jest.fn().mockResolvedValue(postResponse),
      uploadImage: jest.fn().mockResolvedValue(blob),
      likePost: jest.fn().mockResolvedValue({ uri: 'like' }),
      unlikePost: jest.fn().mockResolvedValue({ success: true }),
    };

    const session = createSession();
    api.setSession(session);

    await expect(api.getTimeline(10)).resolves.toBe(feed);
    await expect(api.getTrendingTopics(5)).resolves.toBe(trending);
    await expect(api.getFeeds('did:example', 25)).resolves.toBe(feedsResponse);
    await expect(api.getFeed('at://feed/1', 30)).resolves.toBe(feed);
    await expect(api.getFeedGenerators(['at://feed/a'])).resolves.toBe(feedGenerators);
    await expect(api.getBookmarks(40)).resolves.toBe(bookmarks);
    await expect(api.getPost('at://post/1')).resolves.toBe(post);
    await expect(api.getPostThread('at://post/1')).resolves.toBe(thread);
    await expect(api.getAuthorFeed('did:example', 15)).resolves.toBe(feed);
    await expect(api.getAuthorVideos('did:example', 15)).resolves.toBe(feed);
    await expect(api.getAuthorFeeds('did:example', 15)).resolves.toBe(feedsResponse);
    await expect(api.getAuthorStarterpacks('did:example', 15)).resolves.toBe(starterpacks);
    await expect(api.createPost('did:example', postInput)).resolves.toBe(postResponse);
    await expect(api.uploadImage('file://image.png', 'image/png')).resolves.toBe(blob);
    await expect(api.likePost('at://post/1', 'cid', 'did:example')).resolves.toEqual({ uri: 'like' });
    await expect(api.unlikePost('at://like/1', 'did:example')).resolves.toEqual({ success: true });

    expect(internal.feeds.getTimeline).toHaveBeenCalledWith(10);
    expect(internal.feeds.getTrendingTopics).toHaveBeenCalledWith(5);
    expect(internal.feeds.getFeeds).toHaveBeenCalledWith('did:example', 25, undefined);
    expect(internal.feeds.getFeed).toHaveBeenCalledWith('at://feed/1', 30, undefined);
    expect(internal.feeds.getFeedGenerators).toHaveBeenCalledWith(['at://feed/a']);
    expect(internal.feeds.getBookmarks).toHaveBeenCalledWith(40, undefined);
    expect(internal.feeds.getPost).toHaveBeenCalledWith('at://post/1');
    expect(internal.feeds.createPost).toHaveBeenCalledWith('did:example', postInput);
  });

  it('delegates conversation operations to the conversations client', async () => {
    const { api, internal } = setupApi();
    const convos = { convos: [] } as unknown as BlueskyConvosResponse;
    const messages = { messages: [] } as unknown as BlueskyMessagesResponse;
    const messageInput: BlueskySendMessageInput = { text: 'hi' };
    const sendResponse = { conversation: { id: '1' } } as unknown as BlueskySendMessageResponse;

    internal.conversations = {
      listConversations: jest.fn().mockResolvedValue(convos),
      getMessages: jest.fn().mockResolvedValue(messages),
      sendMessage: jest.fn().mockResolvedValue(sendResponse),
    };

    const session = createSession();
    api.setSession(session);

    await expect(api.listConversations(5)).resolves.toBe(convos);
    await expect(api.getMessages('convo', 10)).resolves.toBe(messages);
    await expect(api.sendMessage('convo', messageInput)).resolves.toBe(sendResponse);

    expect(internal.conversations.listConversations).toHaveBeenCalledWith(5, undefined, undefined, undefined);
    expect(internal.conversations.getMessages).toHaveBeenCalledWith('convo', 10, undefined);
    expect(internal.conversations.sendMessage).toHaveBeenCalledWith('convo', messageInput);
  });

  it('delegates graph, search, and notification helpers to their respective clients', async () => {
    const { api, internal } = setupApi();
    const notifications = { notifications: [] } as unknown as BlueskyNotificationsResponse;
    const unread = { count: 5 } as BlueskyUnreadNotificationCount;
    const actorResults = { actors: [] } as unknown as BlueskySearchActorsResponse;
    const postResults = { posts: [] } as unknown as BlueskySearchPostsResponse;

    internal.graph = {
      followUser: jest.fn().mockResolvedValue({}),
      unfollowUser: jest.fn().mockResolvedValue({}),
      blockUser: jest.fn().mockResolvedValue({}),
      unblockUser: jest.fn().mockResolvedValue({}),
      muteUser: jest.fn().mockResolvedValue({}),
      unmuteUser: jest.fn().mockResolvedValue({}),
      muteActorList: jest.fn().mockResolvedValue({}),
      muteThread: jest.fn().mockResolvedValue({}),
    };

    internal.search = {
      searchProfiles: jest.fn().mockResolvedValue(actorResults),
      searchPosts: jest.fn().mockResolvedValue(postResults),
    };

    internal.notifications = {
      listNotifications: jest.fn().mockResolvedValue(notifications),
      getUnreadCount: jest.fn().mockResolvedValue(unread),
    };

    const session = createSession();
    api.setSession(session);

    await api.followUser('did:example');
    await api.unfollowUser('at://follow/1');
    await api.blockUser('did:example');
    await api.unblockUser('at://block/1');
    await api.muteUser('did:example');
    await api.unmuteUser('did:example');
    await api.muteActorList('at://list/1');
    await api.muteThread('at://post/1');
    await expect(api.searchProfiles('query', 10)).resolves.toBe(actorResults);
    await expect(api.searchPosts('query', 10)).resolves.toBe(postResults);
    await expect(api.listNotifications(20)).resolves.toBe(notifications);
    await expect(api.getUnreadNotificationsCount()).resolves.toBe(unread);

    expect(internal.graph.followUser).toHaveBeenCalledWith('did:example');
    expect(internal.search.searchProfiles).toHaveBeenCalledWith('query', 10, undefined);
    expect(internal.notifications.listNotifications).toHaveBeenCalledWith(
      20,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(internal.notifications.getUnreadCount).toHaveBeenCalledWith();
  });

  it('creates instances using the static helper', () => {
    const api = BlueskyApi.createWithPDS('https://pds.example');
    expect(api).toBeInstanceOf(BlueskyApi);
  });
});
