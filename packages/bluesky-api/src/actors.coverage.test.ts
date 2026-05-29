import { BlueskyActors } from './actors';
import type {
  BlueskyLabelerServicesResponse,
  BlueskyPreference,
  BlueskyPreferencesResponse,
  BlueskyProfileResponse,
} from './types';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown> | FormData | Blob;
  params?: Record<string, string | string[]>;
  headers?: Record<string, string>;
};

describe('BlueskyActors (coverage)', () => {
  class TestActors extends BlueskyActors {
    public authCalls: { endpoint: string; accessJwt: string; options: RequestOptions }[] = [];
    public requestCalls: { endpoint: string; options: RequestOptions }[] = [];

    // Each entry is returned (or thrown, if it is an Error) for the next
    // makeAuthenticatedRequest / makeRequest call, in order.
    public responses: unknown[] = [];

    constructor() {
      super('https://pds.example');
    }

    private next<T>(): T {
      const value = this.responses.shift();
      if (value instanceof Error) {
        throw value;
      }
      return (value as T) ?? (undefined as T);
    }

    protected async makeAuthenticatedRequest<T>(
      endpoint: string,
      accessJwt: string,
      options: RequestOptions = {},
    ): Promise<T> {
      this.authCalls.push({ endpoint, accessJwt, options });
      return this.next<T>();
    }

    protected async makeRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
      this.requestCalls.push({ endpoint, options });
      return this.next<T>();
    }
  }

  it('getProfile requests a profile with labeler headers', async () => {
    const actors = new TestActors();
    const profile = { did: 'did:example:alice' } as unknown as BlueskyProfileResponse;
    actors.responses = [profile];

    const result = await actors.getProfile('jwt', 'did:example:alice', ['did:plc:labeler']);

    expect(result).toBe(profile);
    const call = actors.authCalls[0];
    expect(call.endpoint).toBe('/app.bsky.actor.getProfile');
    expect(call.accessJwt).toBe('jwt');
    expect(call.options.params).toEqual({ actor: 'did:example:alice' });
    expect(call.options.headers?.['atproto-accept-labelers']).toContain('did:plc:labeler');
  });

  it('getProfile works without acceptLabelers', async () => {
    const actors = new TestActors();
    actors.responses = [{} as BlueskyProfileResponse];

    await actors.getProfile('jwt', 'did:example:bob');

    expect(actors.authCalls[0].options.params).toEqual({ actor: 'did:example:bob' });
  });

  it('getProfiles batches actors with labeler headers', async () => {
    const actors = new TestActors();
    const response = { profiles: [] };
    actors.responses = [response];

    const result = await actors.getProfiles('jwt', ['a', 'b'], ['did:plc:labeler']);

    expect(result).toBe(response);
    const call = actors.authCalls[0];
    expect(call.endpoint).toBe('/app.bsky.actor.getProfiles');
    expect(call.options.params).toEqual({ actors: ['a', 'b'] });
    expect(call.options.headers?.['atproto-accept-labelers']).toContain('did:plc:labeler');
  });

  it('getSuggestions uses default limit and omits cursor', async () => {
    const actors = new TestActors();
    actors.responses = [{ actors: [] }];

    await actors.getSuggestions('jwt');

    const call = actors.authCalls[0];
    expect(call.endpoint).toBe('/app.bsky.actor.getSuggestions');
    expect(call.options.params).toEqual({ limit: '10' });
  });

  it('getSuggestions forwards limit, cursor and acceptLabelers', async () => {
    const actors = new TestActors();
    const response = { actors: [], cursor: 'next' };
    actors.responses = [response];

    const result = await actors.getSuggestions('jwt', { limit: 30, cursor: 'c1', acceptLabelers: ['did:plc:labeler'] });

    expect(result).toBe(response);
    const call = actors.authCalls[0];
    expect(call.options.params).toEqual({ limit: '30', cursor: 'c1' });
    expect(call.options.headers?.['atproto-accept-labelers']).toContain('did:plc:labeler');
  });

  it('updateProfile posts the profile fields', async () => {
    const actors = new TestActors();
    const updated = {} as BlueskyProfileResponse;
    actors.responses = [updated];

    const result = await actors.updateProfile('jwt', {
      displayName: 'Alice',
      description: 'bio',
      avatar: { $type: 'blob' } as never,
      banner: { $type: 'blob' } as never,
    });

    expect(result).toBe(updated);
    const call = actors.authCalls[0];
    expect(call.endpoint).toBe('/app.bsky.actor.updateProfile');
    expect(call.options.method).toBe('POST');
    expect(call.options.body).toEqual({
      displayName: 'Alice',
      description: 'bio',
      avatar: { $type: 'blob' },
      banner: { $type: 'blob' },
    });
  });

  it('getPreferences requests preferences without extra options', async () => {
    const actors = new TestActors();
    const prefs = { preferences: [] } as unknown as BlueskyPreferencesResponse;
    actors.responses = [prefs];

    const result = await actors.getPreferences('jwt');

    expect(result).toBe(prefs);
    expect(actors.authCalls[0]).toEqual({
      endpoint: '/app.bsky.actor.getPreferences',
      accessJwt: 'jwt',
      options: {},
    });
  });

  it('putPreferences posts the full preference list', async () => {
    const actors = new TestActors();
    actors.responses = [undefined];
    const preferences = [{ $type: 'app.bsky.actor.defs#savedFeedsPref' }] as unknown as BlueskyPreference[];

    await actors.putPreferences('jwt', preferences);

    const call = actors.authCalls[0];
    expect(call.endpoint).toBe('/app.bsky.actor.putPreferences');
    expect(call.options.method).toBe('POST');
    expect(call.options.body).toEqual({ preferences });
  });

  it('getLabelerServices defaults detailed to true', async () => {
    const actors = new TestActors();
    const response = { views: [] } as unknown as BlueskyLabelerServicesResponse;
    actors.responses = [response];

    const result = await actors.getLabelerServices('jwt', ['did:plc:labeler']);

    expect(result).toBe(response);
    const call = actors.authCalls[0];
    expect(call.endpoint).toBe('/app.bsky.labeler.getServices');
    expect(call.options.params).toEqual({ dids: ['did:plc:labeler'], detailed: 'true' });
  });

  it('getLabelerServices passes detailed=false', async () => {
    const actors = new TestActors();
    actors.responses = [{} as BlueskyLabelerServicesResponse];

    await actors.getLabelerServices('jwt', ['did:plc:labeler'], false);

    expect(actors.authCalls[0].options.params).toEqual({ dids: ['did:plc:labeler'], detailed: 'false' });
  });

  it('setPinnedPost reads existing record then writes pinnedPost', async () => {
    const actors = new TestActors();
    actors.responses = [
      { uri: 'u', cid: 'c', value: { displayName: 'Alice' } },
      { ok: true },
    ];

    await actors.setPinnedPost('jwt', 'did:example:alice', { uri: 'post-uri', cid: 'post-cid' });

    expect(actors.authCalls[0].endpoint).toBe('/com.atproto.repo.getRecord');
    const putCall = actors.authCalls[1];
    expect(putCall.endpoint).toBe('/com.atproto.repo.putRecord');
    expect(putCall.options.method).toBe('POST');
    expect(putCall.options.body).toEqual({
      repo: 'did:example:alice',
      collection: 'app.bsky.actor.profile',
      rkey: 'self',
      record: { displayName: 'Alice', pinnedPost: { uri: 'post-uri', cid: 'post-cid' } },
    });
  });

  it('setPinnedPost removes pinnedPost when passed null and handles missing record', async () => {
    const actors = new TestActors();
    actors.responses = [new Error('not found'), { ok: true }];

    await actors.setPinnedPost('jwt', 'did:example:alice', null);

    const putCall = actors.authCalls[1];
    expect(putCall.options.body).toMatchObject({ record: {} });
    const record = (putCall.options.body as { record: Record<string, unknown> }).record;
    expect('pinnedPost' in record).toBe(false);
  });

  it('getProfileRecord returns the record', async () => {
    const actors = new TestActors();
    const record = { uri: 'u', cid: 'c', value: {} };
    actors.responses = [record];

    const result = await actors.getProfileRecord('jwt', 'did:example:alice');

    expect(result).toBe(record);
    expect(actors.authCalls[0].endpoint).toBe('/com.atproto.repo.getRecord');
  });

  it('getProfileRecord returns null on RecordNotFound', async () => {
    const actors = new TestActors();
    actors.responses = [Object.assign(new Error('nope'), { errorCode: 'RecordNotFound' })];

    const result = await actors.getProfileRecord('jwt', 'did:example:alice');

    expect(result).toBeNull();
  });

  it('getProfileRecord returns null on 404 status', async () => {
    const actors = new TestActors();
    actors.responses = [Object.assign(new Error('nope'), { status: 404 })];

    const result = await actors.getProfileRecord('jwt', 'did:example:alice');

    expect(result).toBeNull();
  });

  it('getProfileRecord rethrows other errors', async () => {
    const actors = new TestActors();
    actors.responses = [Object.assign(new Error('boom'), { status: 500 })];

    await expect(actors.getProfileRecord('jwt', 'did:example:alice')).rejects.toThrow('boom');
  });

  it('setProfileSelfLabel adds a label to a record with no labels', async () => {
    const actors = new TestActors();
    actors.responses = [
      { uri: 'u', cid: 'c', value: { displayName: 'Alice' } },
      { ok: true },
    ];

    await actors.setProfileSelfLabel('jwt', 'did:example:alice', 'automated', true);

    const putCall = actors.authCalls[1];
    expect(putCall.endpoint).toBe('/com.atproto.repo.putRecord');
    const record = (putCall.options.body as { record: Record<string, unknown> }).record;
    expect(record.labels).toEqual({
      $type: 'com.atproto.label.defs#selfLabels',
      values: [{ val: 'automated' }],
    });
    expect(record.displayName).toBe('Alice');
  });

  it('setProfileSelfLabel removes the last label and deletes the labels field', async () => {
    const actors = new TestActors();
    actors.responses = [
      {
        uri: 'u',
        cid: 'c',
        value: {
          labels: { $type: 'com.atproto.label.defs#selfLabels', values: [{ val: 'automated' }] },
        },
      },
      { ok: true },
    ];

    await actors.setProfileSelfLabel('jwt', 'did:example:alice', 'automated', false);

    const record = (actors.authCalls[1].options.body as { record: Record<string, unknown> }).record;
    expect('labels' in record).toBe(false);
  });

  it('setProfileSelfLabel keeps other labels when removing one', async () => {
    const actors = new TestActors();
    actors.responses = [
      {
        uri: 'u',
        cid: 'c',
        value: {
          labels: {
            $type: 'com.atproto.label.defs#selfLabels',
            values: [{ val: 'automated' }, { val: '!no-unauthenticated' }],
          },
        },
      },
      { ok: true },
    ];

    await actors.setProfileSelfLabel('jwt', 'did:example:alice', 'automated', false);

    const record = (actors.authCalls[1].options.body as { record: Record<string, unknown> }).record;
    expect(record.labels).toEqual({
      $type: 'com.atproto.label.defs#selfLabels',
      values: [{ val: '!no-unauthenticated' }],
    });
  });

  it('setProfileSelfLabel handles a null existing record (no value)', async () => {
    const actors = new TestActors();
    // getProfileRecord returns null (RecordNotFound), then putRecord succeeds.
    actors.responses = [Object.assign(new Error('nf'), { errorCode: 'RecordNotFound' }), { ok: true }];

    await actors.setProfileSelfLabel('jwt', 'did:example:alice', 'automated', true);

    const record = (actors.authCalls[1].options.body as { record: Record<string, unknown> }).record;
    expect(record.labels).toEqual({
      $type: 'com.atproto.label.defs#selfLabels',
      values: [{ val: 'automated' }],
    });
  });

  it('setLoggedOutVisibilityDiscouraged toggles the !no-unauthenticated label', async () => {
    const actors = new TestActors();
    actors.responses = [{ uri: 'u', cid: 'c', value: {} }, { ok: true }];

    await actors.setLoggedOutVisibilityDiscouraged('jwt', 'did:example:alice', true);

    const record = (actors.authCalls[1].options.body as { record: Record<string, unknown> }).record;
    expect(record.labels).toEqual({
      $type: 'com.atproto.label.defs#selfLabels',
      values: [{ val: '!no-unauthenticated' }],
    });
  });

  it('setAccountAutomated toggles the automated label', async () => {
    const actors = new TestActors();
    actors.responses = [{ uri: 'u', cid: 'c', value: {} }, { ok: true }];

    await actors.setAccountAutomated('jwt', 'did:example:alice', true);

    const record = (actors.authCalls[1].options.body as { record: Record<string, unknown> }).record;
    expect(record.labels).toEqual({
      $type: 'com.atproto.label.defs#selfLabels',
      values: [{ val: 'automated' }],
    });
  });

  it('setActorStatus writes a live status with an external embed', async () => {
    const actors = new TestActors();
    // getStatusRecord (existing), then putRecord succeeds.
    actors.responses = [{ uri: 'u', cid: 'existing-cid', value: {} }, { ok: true }];

    await actors.setActorStatus('jwt', 'did:example:alice', {
      durationMinutes: 60,
      external: { uri: 'https://live.example', title: 'Live', description: 'desc' },
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(actors.authCalls[0].endpoint).toBe('/com.atproto.repo.getRecord');
    const putCall = actors.authCalls[1];
    expect(putCall.endpoint).toBe('/com.atproto.repo.putRecord');
    const body = putCall.options.body as { record: Record<string, unknown>; swapRecord: string | null };
    expect(body.swapRecord).toBe('existing-cid');
    expect(body.record).toEqual({
      $type: 'app.bsky.actor.status',
      status: 'app.bsky.actor.status#live',
      durationMinutes: 60,
      createdAt: '2026-01-01T00:00:00.000Z',
      embed: {
        $type: 'app.bsky.embed.external',
        external: {
          $type: 'app.bsky.embed.external#external',
          uri: 'https://live.example',
          title: 'Live',
          description: 'desc',
        },
      },
    });
  });

  it('setActorStatus generates createdAt and swapRecord null when no existing record', async () => {
    const actors = new TestActors();
    actors.responses = [Object.assign(new Error('nf'), { errorCode: 'RecordNotFound' }), { ok: true }];

    await actors.setActorStatus('jwt', 'did:example:alice', { durationMinutes: 1 });

    const body = actors.authCalls[1].options.body as { record: Record<string, unknown>; swapRecord: string | null };
    expect(body.swapRecord).toBeNull();
    expect(typeof body.record.createdAt).toBe('string');
    expect('embed' in body.record).toBe(false);
  });

  it('setActorStatus retries on InvalidSwap then succeeds', async () => {
    const actors = new TestActors();
    actors.responses = [
      // attempt 1: read then InvalidSwap
      { uri: 'u', cid: 'c1', value: {} },
      Object.assign(new Error('swap'), { errorCode: 'InvalidSwap' }),
      // attempt 2: read then success
      { uri: 'u', cid: 'c2', value: {} },
      { ok: true },
    ];

    await actors.setActorStatus('jwt', 'did:example:alice', { durationMinutes: 5 });

    // getRecord, putRecord(fail), getRecord, putRecord(success)
    expect(actors.authCalls.map((c) => c.endpoint)).toEqual([
      '/com.atproto.repo.getRecord',
      '/com.atproto.repo.putRecord',
      '/com.atproto.repo.getRecord',
      '/com.atproto.repo.putRecord',
    ]);
  });

  it('setActorStatus rethrows non-InvalidSwap errors', async () => {
    const actors = new TestActors();
    actors.responses = [
      { uri: 'u', cid: 'c1', value: {} },
      Object.assign(new Error('boom'), { errorCode: 'SomethingElse' }),
    ];

    await expect(actors.setActorStatus('jwt', 'did:example:alice', { durationMinutes: 5 })).rejects.toThrow('boom');
  });

  it('setActorStatus gives up after max attempts of InvalidSwap', async () => {
    const actors = new TestActors();
    const invalidSwap = () => Object.assign(new Error('swap'), { errorCode: 'InvalidSwap' });
    actors.responses = [
      { uri: 'u', cid: 'c1', value: {} }, invalidSwap(),
      { uri: 'u', cid: 'c2', value: {} }, invalidSwap(),
      { uri: 'u', cid: 'c3', value: {} }, invalidSwap(),
      { uri: 'u', cid: 'c4', value: {} }, invalidSwap(),
      { uri: 'u', cid: 'c5', value: {} }, invalidSwap(),
    ];

    await expect(actors.setActorStatus('jwt', 'did:example:alice', { durationMinutes: 5 })).rejects.toThrow('swap');
  });

  it('setActorStatus rethrows a non-404 error while reading the status record', async () => {
    const actors = new TestActors();
    // getStatusRecord throws a 500 (not RecordNotFound / 404) -> rethrown.
    actors.responses = [Object.assign(new Error('read failed'), { status: 500 })];

    await expect(actors.setActorStatus('jwt', 'did:example:alice', { durationMinutes: 5 })).rejects.toThrow(
      'read failed',
    );
  });

  it('clearActorStatus deletes the status record', async () => {
    const actors = new TestActors();
    actors.responses = [{ ok: true }];

    await actors.clearActorStatus('jwt', 'did:example:alice');

    const call = actors.authCalls[0];
    expect(call.endpoint).toBe('/com.atproto.repo.deleteRecord');
    expect(call.options.method).toBe('POST');
    expect(call.options.body).toEqual({
      repo: 'did:example:alice',
      collection: 'app.bsky.actor.status',
      rkey: 'self',
    });
  });

  it('clearActorStatus treats RecordNotFound as success', async () => {
    const actors = new TestActors();
    actors.responses = [Object.assign(new Error('nf'), { errorCode: 'RecordNotFound' })];

    await expect(actors.clearActorStatus('jwt', 'did:example:alice')).resolves.toBeUndefined();
  });

  it('clearActorStatus treats 404 as success', async () => {
    const actors = new TestActors();
    actors.responses = [Object.assign(new Error('nf'), { status: 404 })];

    await expect(actors.clearActorStatus('jwt', 'did:example:alice')).resolves.toBeUndefined();
  });

  it('clearActorStatus rethrows other errors', async () => {
    const actors = new TestActors();
    actors.responses = [Object.assign(new Error('boom'), { status: 500 })];

    await expect(actors.clearActorStatus('jwt', 'did:example:alice')).rejects.toThrow('boom');
  });
});
