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

const createBlueskyApiHarness = () => {
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

describe('BlueskyApi', () => {
  it('delegates authentication operations to the auth client', async () => {
    const { api, internal } = createBlueskyApiHarness();
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
    await expect(api.refreshSession('refresh')).resolves.toBe(refreshed);

    expect(internal.auth.createSession).toHaveBeenCalledWith('alice.test', 'password');
    expect(internal.auth.refreshSession).toHaveBeenCalledWith('refresh');
  });

  it('forwards actor requests to the actors client', async () => {
    const { api, internal } = createBlueskyApiHarness();
    const profile = { handle: 'alice.test' } as unknown as BlueskyProfileResponse;
    const preferences = { preferences: [] } as BlueskyPreferencesResponse;

    internal.actors = {
      getProfile: jest.fn().mockResolvedValue(profile),
      updateProfile: jest.fn().mockResolvedValue(profile),
      getPreferences: jest.fn().mockResolvedValue(preferences),
    };

    await expect(api.getProfile('jwt', 'did:example:alice')).resolves.toBe(profile);
    await expect(api.updateProfile('jwt', { displayName: 'Alice' })).resolves.toBe(profile);
    await expect(api.getPreferences('jwt')).resolves.toBe(preferences);

    expect(internal.actors.getProfile).toHaveBeenCalledWith('jwt', 'did:example:alice');
    expect(internal.actors.updateProfile).toHaveBeenCalledWith('jwt', { displayName: 'Alice' });
    expect(internal.actors.getPreferences).toHaveBeenCalledWith('jwt');
  });

  it('routes feed operations to the feeds client', async () => {
    const { api, internal } = createBlueskyApiHarness();
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

    await expect(api.getTimeline('jwt', 10)).resolves.toBe(feed);
    await expect(api.getTrendingTopics(5)).resolves.toBe(trending);
    await expect(api.getFeeds('jwt', 'did:example', 25)).resolves.toBe(feedsResponse);
    await expect(api.getFeed('jwt', 'at://feed/1', 30)).resolves.toBe(feed);
    await expect(api.getFeedGenerators('jwt', ['at://feed/a'])).resolves.toBe(feedGenerators);
    await expect(api.getBookmarks('jwt', 40)).resolves.toBe(bookmarks);
    await expect(api.getPost('jwt', 'at://post/1')).resolves.toBe(post);
    await expect(api.getPostThread('jwt', 'at://post/1')).resolves.toBe(thread);
    await expect(api.getAuthorFeed('jwt', 'did:example', 15)).resolves.toBe(feed);
    await expect(api.getAuthorVideos('jwt', 'did:example', 15)).resolves.toBe(feed);
    await expect(api.getAuthorFeeds('jwt', 'did:example', 15)).resolves.toBe(feedsResponse);
    await expect(api.getAuthorStarterpacks('jwt', 'did:example', 15)).resolves.toBe(starterpacks);
    await expect(api.createPost('jwt', 'did:example', postInput)).resolves.toBe(postResponse);
    await expect(api.uploadImage('jwt', 'file://image.png', 'image/png')).resolves.toBe(blob);
    await expect(api.likePost('jwt', 'at://post/1', 'cid', 'did:example')).resolves.toEqual({ uri: 'like' });
    await expect(api.unlikePost('jwt', 'at://like/1', 'did:example')).resolves.toEqual({ success: true });

    expect(internal.feeds.getTimeline).toHaveBeenCalledWith('jwt', 10);
    expect(internal.feeds.getTrendingTopics).toHaveBeenCalledWith(5);
    expect(internal.feeds.getFeeds).toHaveBeenCalledWith('jwt', 'did:example', 25, undefined);
    expect(internal.feeds.getFeed).toHaveBeenCalledWith('jwt', 'at://feed/1', 30, undefined);
    expect(internal.feeds.getFeedGenerators).toHaveBeenCalledWith('jwt', ['at://feed/a']);
    expect(internal.feeds.createPost).toHaveBeenCalledWith('jwt', 'did:example', postInput);
  });

  it('delegates conversation operations to the conversations client', async () => {
    const { api, internal } = createBlueskyApiHarness();
    const convos = { convos: [] } as unknown as BlueskyConvosResponse;
    const messages = { messages: [] } as unknown as BlueskyMessagesResponse;
    const messageInput: BlueskySendMessageInput = { text: 'hi' };
    const sendResponse = { conversation: { id: '1' } } as unknown as BlueskySendMessageResponse;

    internal.conversations = {
      listConversations: jest.fn().mockResolvedValue(convos),
      getMessages: jest.fn().mockResolvedValue(messages),
      sendMessage: jest.fn().mockResolvedValue(sendResponse),
    };

    await expect(api.listConversations('jwt', 5)).resolves.toBe(convos);
    await expect(api.getMessages('jwt', 'convo', 10)).resolves.toBe(messages);
    await expect(api.sendMessage('jwt', 'convo', messageInput)).resolves.toBe(sendResponse);

    expect(internal.conversations.listConversations).toHaveBeenCalledWith('jwt', 5, undefined, undefined, undefined);
    expect(internal.conversations.getMessages).toHaveBeenCalledWith('jwt', 'convo', 10, undefined);
    expect(internal.conversations.sendMessage).toHaveBeenCalledWith('jwt', 'convo', messageInput);
  });

  it('delegates graph, search, and notification helpers to their respective clients', async () => {
    const { api, internal } = createBlueskyApiHarness();
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

    await api.followUser('jwt', 'did:example');
    await api.unfollowUser('jwt', 'at://follow/1');
    await api.blockUser('jwt', 'did:example');
    await api.unblockUser('jwt', 'at://block/1');
    await api.muteUser('jwt', 'did:example');
    await api.unmuteUser('jwt', 'did:example');
    await api.muteActorList('jwt', 'at://list/1');
    await api.muteThread('jwt', 'at://post/1');
    await expect(api.searchProfiles('jwt', 'query', 10)).resolves.toBe(actorResults);
    await expect(api.searchPosts('jwt', 'query', 10)).resolves.toBe(postResults);
    await expect(api.listNotifications('jwt', 20)).resolves.toBe(notifications);
    await expect(api.getUnreadNotificationsCount('jwt')).resolves.toBe(unread);

    expect(internal.graph.followUser).toHaveBeenCalledWith('jwt', 'did:example');
    expect(internal.search.searchProfiles).toHaveBeenCalledWith('jwt', 'query', 10, undefined);
    expect(internal.notifications.listNotifications).toHaveBeenCalledWith(
      'jwt',
      20,
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(internal.notifications.getUnreadCount).toHaveBeenCalledWith('jwt');
  });

  it('creates instances using the static helper', () => {
    const api = BlueskyApi.createWithPDS('https://pds.example');
    expect(api).toBeInstanceOf(BlueskyApi);
  });
});
