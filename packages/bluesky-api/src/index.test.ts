import * as Bluesky from './index';

describe('index exports', () => {
  it('exposes the main API surface', () => {
    expect(Bluesky.BlueskyApi).toBeDefined();
    expect(Bluesky.BlueskyAuth).toBeDefined();
    expect(Bluesky.BlueskyActors).toBeDefined();
    expect(Bluesky.BlueskyFeeds).toBeDefined();
    expect(Bluesky.BlueskyConversations).toBeDefined();
    expect(Bluesky.BlueskyGraph).toBeDefined();
    expect(Bluesky.BlueskySearch).toBeDefined();
    expect(Bluesky.BlueskyNotifications).toBeDefined();
    expect(Bluesky.BlueskyRepos).toBeDefined();
    expect(typeof Bluesky.resolveBlueskyVideoUrl).toBe('function');
    expect(typeof Bluesky.getPdsUrlFromDid).toBe('function');
    expect(typeof Bluesky.getPdsUrlFromHandle).toBe('function');
  });
});
