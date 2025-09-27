import { BlueskyActors } from './actors';
import type { BlueskyPreferencesResponse, BlueskyProfileResponse } from './types';

describe('BlueskyActors', () => {
  class TestActors extends BlueskyActors {
    public lastCall?: {
      endpoint: string;
      accessJwt: string;
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      };
    };

    public response: unknown;

    constructor() {
      super('https://pds.example');
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      accessJwt: string,
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      } = {},
    ): Promise<T> {
      this.lastCall = { endpoint, accessJwt, options };
      return this.response as T;
    }
  }

  it('requests a profile by DID', async () => {
    const actors = new TestActors();
    const profileResponse: BlueskyProfileResponse = {
      did: 'did:example:alice',
      handle: 'alice.test',
      displayName: 'Alice',
      description: 'Bio',
      avatar: 'https://cdn.example/avatar.png',
      banner: 'https://cdn.example/banner.png',
      indexedAt: '2024-01-01T00:00:00.000Z',
    };
    actors.response = profileResponse;

    const result = await actors.getProfile('jwt-token', 'did:example:alice');

    expect(result).toEqual(profileResponse);
    expect(actors.lastCall).toEqual({
      endpoint: '/app.bsky.actor.getProfile',
      accessJwt: 'jwt-token',
      options: {
        params: { actor: 'did:example:alice' },
      },
    });
  });

  it('updates profile information with provided data', async () => {
    const actors = new TestActors();
    const updatedProfile: BlueskyProfileResponse = {
      did: 'did:example:alice',
      handle: 'alice.test',
      displayName: 'Alice Updated',
      description: 'Updated bio',
      avatar: 'https://cdn.example/new-avatar.png',
      banner: 'https://cdn.example/new-banner.png',
      indexedAt: '2024-01-02T00:00:00.000Z',
    };
    actors.response = updatedProfile;

    const result = await actors.updateProfile('jwt-token', {
      displayName: 'Alice Updated',
      description: 'Updated bio',
      avatar: 'https://cdn.example/new-avatar.png',
      banner: 'https://cdn.example/new-banner.png',
    });

    expect(result).toEqual(updatedProfile);
    expect(actors.lastCall).toEqual({
      endpoint: '/app.bsky.actor.updateProfile',
      accessJwt: 'jwt-token',
      options: {
        method: 'POST',
        body: {
          displayName: 'Alice Updated',
          description: 'Updated bio',
          avatar: 'https://cdn.example/new-avatar.png',
          banner: 'https://cdn.example/new-banner.png',
        },
      },
    });
  });

  it('requests user preferences without additional options', async () => {
    const actors = new TestActors();
    const preferencesResponse: BlueskyPreferencesResponse = {
      preferences: [
        {
          $type: 'app.bsky.actor.defs#contentLabelPref',
          label: 'nsfw',
          visibility: 'warn',
        },
      ],
    };
    actors.response = preferencesResponse;

    const result = await actors.getPreferences('jwt-token');

    expect(result).toEqual(preferencesResponse);
    expect(actors.lastCall).toEqual({
      endpoint: '/app.bsky.actor.getPreferences',
      accessJwt: 'jwt-token',
      options: {},
    });
  });
});
