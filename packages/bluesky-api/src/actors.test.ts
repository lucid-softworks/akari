import { BlueskyActors } from './actors';
import type { BlueskyPreferencesResponse, BlueskyProfileResponse, BlueskySession } from './types';

describe('BlueskyActors', () => {
  const createSession = (overrides: Partial<BlueskySession> = {}): BlueskySession =>
    ({
      handle: 'user.test',
      did: 'did:plc:123',
      active: true,
      accessJwt: 'jwt-token',
      refreshJwt: 'refresh-token',
      ...overrides,
    } as BlueskySession);

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
      options: {
        method?: 'GET' | 'POST';
        body?: Record<string, unknown> | FormData | Blob;
        params?: Record<string, string | string[]>;
        headers?: Record<string, string>;
      } = {},
    ): Promise<T> {
      const session = this.requireSession();
      this.lastCall = { endpoint, accessJwt: session.accessJwt, options };
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

    const session = createSession();
    actors.useSession(session);
    const result = await actors.getProfile('did:example:alice');

    expect(result).toEqual(profileResponse);
    expect(actors.lastCall).toEqual({
      endpoint: '/app.bsky.actor.getProfile',
      accessJwt: session.accessJwt,
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

    const session = createSession();
    actors.useSession(session);
    const result = await actors.updateProfile({
      displayName: 'Alice Updated',
      description: 'Updated bio',
      avatar: 'https://cdn.example/new-avatar.png',
      banner: 'https://cdn.example/new-banner.png',
    });

    expect(result).toEqual(updatedProfile);
    expect(actors.lastCall).toEqual({
      endpoint: '/app.bsky.actor.updateProfile',
      accessJwt: session.accessJwt,
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

    const session = createSession();
    actors.useSession(session);
    const result = await actors.getPreferences();

    expect(result).toEqual(preferencesResponse);
    expect(actors.lastCall).toEqual({
      endpoint: '/app.bsky.actor.getPreferences',
      accessJwt: session.accessJwt,
      options: {},
    });
  });
});
