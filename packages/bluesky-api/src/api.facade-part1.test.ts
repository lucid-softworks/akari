import { BlueskyApi } from './api';
import type {
  BlueskyPreference,
  BlueskyPreferencesResponse,
  BlueskyProfileResponse,
  BlueskyProfileUpdateInput,
  BlueskyRecipeRecordsResponse,
  BlueskySession,
  BlueskyTangledReposResponse,
} from './types';

/**
 * Supplementary coverage for the first half of the {@link BlueskyApi} facade
 * (roughly the createAccount -> getActorSifaEducation span). Every method here
 * is a thin delegation to a private sub-client, so each test replaces the
 * relevant sub-client with jest mocks and asserts both the returned value and
 * the exact arguments forwarded (including default-value / optional branches).
 */
describe('BlueskyApi facade (part 1)', () => {
  const setupApi = () => {
    const api = new BlueskyApi('https://pds.example');
    const internal = api as unknown as {
      auth: Record<string, jest.Mock>;
      actors: Record<string, jest.Mock>;
      repos: Record<string, jest.Mock>;
      grain: Record<string, jest.Mock>;
      flashes: Record<string, jest.Mock>;
      spark: Record<string, jest.Mock>;
      poll: Record<string, jest.Mock>;
      rpg: Record<string, jest.Mock>;
      sifa: Record<string, jest.Mock>;
    };

    return { api, internal };
  };

  const session: BlueskySession = {
    did: 'did:example:alice',
    handle: 'alice.test',
    active: true,
    accessJwt: 'access',
    refreshJwt: 'refresh',
  };

  describe('auth delegation', () => {
    it('createAccount forwards the args object', async () => {
      const { api, internal } = setupApi();
      internal.auth = { createAccount: jest.fn().mockResolvedValue(session) };

      const args = { email: 'a@b.com', handle: 'alice.test', password: 'pw', inviteCode: 'inv-1' };
      await expect(api.createAccount(args)).resolves.toBe(session);
      expect(internal.auth.createAccount).toHaveBeenCalledWith(args);
    });

    it('refreshSession forwards the refresh token', async () => {
      const { api, internal } = setupApi();
      const refreshed = { ...session, accessJwt: 'new' };
      internal.auth = { refreshSession: jest.fn().mockResolvedValue(refreshed) };

      await expect(api.refreshSession('refresh')).resolves.toBe(refreshed);
      expect(internal.auth.refreshSession).toHaveBeenCalledWith('refresh');
    });

    it('getServiceAuth forwards aud/lxm and the optional expSeconds', async () => {
      const { api, internal } = setupApi();
      const token = { token: 'svc-jwt' };
      internal.auth = { getServiceAuth: jest.fn().mockResolvedValue(token) };

      await expect(api.getServiceAuth('jwt', 'did:aud', 'app.bsky.lxm', 60)).resolves.toBe(token);
      expect(internal.auth.getServiceAuth).toHaveBeenCalledWith('jwt', 'did:aud', 'app.bsky.lxm', 60);
    });

    it('getServiceAuth omits expSeconds when not provided', async () => {
      const { api, internal } = setupApi();
      const token = { token: 'svc-jwt' };
      internal.auth = { getServiceAuth: jest.fn().mockResolvedValue(token) };

      await expect(api.getServiceAuth('jwt', 'did:aud', 'app.bsky.lxm')).resolves.toBe(token);
      expect(internal.auth.getServiceAuth).toHaveBeenCalledWith('jwt', 'did:aud', 'app.bsky.lxm', undefined);
    });

    it('getSession forwards the access token', async () => {
      const { api, internal } = setupApi();
      const sessionInfo = { handle: 'alice.test', did: 'did:example:alice' };
      internal.auth = { getSession: jest.fn().mockResolvedValue(sessionInfo) };

      await expect(api.getSession('jwt')).resolves.toBe(sessionInfo);
      expect(internal.auth.getSession).toHaveBeenCalledWith('jwt');
    });

    it('updateHandle forwards the new handle', async () => {
      const { api, internal } = setupApi();
      internal.auth = { updateHandle: jest.fn().mockResolvedValue(undefined) };

      await expect(api.updateHandle('jwt', 'new.handle')).resolves.toBeUndefined();
      expect(internal.auth.updateHandle).toHaveBeenCalledWith('jwt', 'new.handle');
    });

    it('requestEmailUpdate forwards the access token', async () => {
      const { api, internal } = setupApi();
      const result = { tokenRequired: true };
      internal.auth = { requestEmailUpdate: jest.fn().mockResolvedValue(result) };

      await expect(api.requestEmailUpdate('jwt')).resolves.toBe(result);
      expect(internal.auth.requestEmailUpdate).toHaveBeenCalledWith('jwt');
    });

    it('updateEmail forwards email and the optional token', async () => {
      const { api, internal } = setupApi();
      internal.auth = { updateEmail: jest.fn().mockResolvedValue(undefined) };

      await api.updateEmail('jwt', 'new@b.com', 'tok-1');
      expect(internal.auth.updateEmail).toHaveBeenCalledWith('jwt', 'new@b.com', 'tok-1');
    });

    it('updateEmail omits the token when not provided', async () => {
      const { api, internal } = setupApi();
      internal.auth = { updateEmail: jest.fn().mockResolvedValue(undefined) };

      await api.updateEmail('jwt', 'new@b.com');
      expect(internal.auth.updateEmail).toHaveBeenCalledWith('jwt', 'new@b.com', undefined);
    });

    it('requestPasswordReset forwards the email', async () => {
      const { api, internal } = setupApi();
      internal.auth = { requestPasswordReset: jest.fn().mockResolvedValue(undefined) };

      await api.requestPasswordReset('a@b.com');
      expect(internal.auth.requestPasswordReset).toHaveBeenCalledWith('a@b.com');
    });

    it('deactivateAccount forwards the optional deleteAfter', async () => {
      const { api, internal } = setupApi();
      internal.auth = { deactivateAccount: jest.fn().mockResolvedValue(undefined) };

      await api.deactivateAccount('jwt', '2026-01-01T00:00:00Z');
      expect(internal.auth.deactivateAccount).toHaveBeenCalledWith('jwt', '2026-01-01T00:00:00Z');
    });

    it('deactivateAccount omits deleteAfter when not provided', async () => {
      const { api, internal } = setupApi();
      internal.auth = { deactivateAccount: jest.fn().mockResolvedValue(undefined) };

      await api.deactivateAccount('jwt');
      expect(internal.auth.deactivateAccount).toHaveBeenCalledWith('jwt', undefined);
    });

    it('requestAccountDelete forwards the access token', async () => {
      const { api, internal } = setupApi();
      internal.auth = { requestAccountDelete: jest.fn().mockResolvedValue(undefined) };

      await api.requestAccountDelete('jwt');
      expect(internal.auth.requestAccountDelete).toHaveBeenCalledWith('jwt');
    });

    it('deleteAccount forwards did/password/token', async () => {
      const { api, internal } = setupApi();
      internal.auth = { deleteAccount: jest.fn().mockResolvedValue(undefined) };

      await api.deleteAccount('did:example:alice', 'pw', 'tok-1');
      expect(internal.auth.deleteAccount).toHaveBeenCalledWith('did:example:alice', 'pw', 'tok-1');
    });

    it('exportRepo forwards jwt/did and returns the Blob', async () => {
      const { api, internal } = setupApi();
      const blob = new Blob(['car-data']);
      internal.auth = { exportRepo: jest.fn().mockResolvedValue(blob) };

      await expect(api.exportRepo('jwt', 'did:example:alice')).resolves.toBe(blob);
      expect(internal.auth.exportRepo).toHaveBeenCalledWith('jwt', 'did:example:alice');
    });

    it('listAppPasswords forwards the access token', async () => {
      const { api, internal } = setupApi();
      const result = { passwords: [] };
      internal.auth = { listAppPasswords: jest.fn().mockResolvedValue(result) };

      await expect(api.listAppPasswords('jwt')).resolves.toBe(result);
      expect(internal.auth.listAppPasswords).toHaveBeenCalledWith('jwt');
    });

    it('createAppPassword forwards name and privileged flag', async () => {
      const { api, internal } = setupApi();
      const result = { name: 'cli', password: 'secret', createdAt: 'now' };
      internal.auth = { createAppPassword: jest.fn().mockResolvedValue(result) };

      await expect(api.createAppPassword('jwt', 'cli', true)).resolves.toBe(result);
      expect(internal.auth.createAppPassword).toHaveBeenCalledWith('jwt', 'cli', true);
    });

    it('createAppPassword defaults privileged to false', async () => {
      const { api, internal } = setupApi();
      const result = { name: 'cli', password: 'secret', createdAt: 'now' };
      internal.auth = { createAppPassword: jest.fn().mockResolvedValue(result) };

      await api.createAppPassword('jwt', 'cli');
      expect(internal.auth.createAppPassword).toHaveBeenCalledWith('jwt', 'cli', false);
    });

    it('revokeAppPassword forwards the name', async () => {
      const { api, internal } = setupApi();
      internal.auth = { revokeAppPassword: jest.fn().mockResolvedValue(undefined) };

      await api.revokeAppPassword('jwt', 'cli');
      expect(internal.auth.revokeAppPassword).toHaveBeenCalledWith('jwt', 'cli');
    });
  });

  describe('actors delegation', () => {
    const profile = { handle: 'alice.test' } as unknown as BlueskyProfileResponse;

    it('getProfile forwards optional acceptLabelers', async () => {
      const { api, internal } = setupApi();
      internal.actors = { getProfile: jest.fn().mockResolvedValue(profile) };

      await expect(api.getProfile('jwt', 'did:example:alice', ['did:labeler'])).resolves.toBe(profile);
      expect(internal.actors.getProfile).toHaveBeenCalledWith('jwt', 'did:example:alice', ['did:labeler']);
    });

    it('getProfile omits acceptLabelers when not provided', async () => {
      const { api, internal } = setupApi();
      internal.actors = { getProfile: jest.fn().mockResolvedValue(profile) };

      await api.getProfile('jwt', 'did:example:alice');
      expect(internal.actors.getProfile).toHaveBeenCalledWith('jwt', 'did:example:alice', undefined);
    });

    it('getProfiles forwards the actor list and optional labelers', async () => {
      const { api, internal } = setupApi();
      const result = { profiles: [] };
      internal.actors = { getProfiles: jest.fn().mockResolvedValue(result) };

      await expect(api.getProfiles('jwt', ['did:a', 'did:b'], ['did:labeler'])).resolves.toBe(result);
      expect(internal.actors.getProfiles).toHaveBeenCalledWith('jwt', ['did:a', 'did:b'], ['did:labeler']);
    });

    it('getSuggestions forwards the options object', async () => {
      const { api, internal } = setupApi();
      const result = { actors: [] };
      internal.actors = { getSuggestions: jest.fn().mockResolvedValue(result) };

      const options = { limit: 10, cursor: 'c1' };
      await expect(api.getSuggestions('jwt', options)).resolves.toBe(result);
      expect(internal.actors.getSuggestions).toHaveBeenCalledWith('jwt', options);
    });

    it('getSuggestions omits options when not provided', async () => {
      const { api, internal } = setupApi();
      const result = { actors: [] };
      internal.actors = { getSuggestions: jest.fn().mockResolvedValue(result) };

      await api.getSuggestions('jwt');
      expect(internal.actors.getSuggestions).toHaveBeenCalledWith('jwt', undefined);
    });

    it('updateProfile forwards the profile data', async () => {
      const { api, internal } = setupApi();
      internal.actors = { updateProfile: jest.fn().mockResolvedValue(profile) };

      const update: BlueskyProfileUpdateInput = { displayName: 'Alice' };
      await expect(api.updateProfile('jwt', update)).resolves.toBe(profile);
      expect(internal.actors.updateProfile).toHaveBeenCalledWith('jwt', update);
    });

    it('getPreferences forwards the access token', async () => {
      const { api, internal } = setupApi();
      const prefs = { preferences: [] } as BlueskyPreferencesResponse;
      internal.actors = { getPreferences: jest.fn().mockResolvedValue(prefs) };

      await expect(api.getPreferences('jwt')).resolves.toBe(prefs);
      expect(internal.actors.getPreferences).toHaveBeenCalledWith('jwt');
    });

    it('putPreferences forwards the preference array', async () => {
      const { api, internal } = setupApi();
      internal.actors = { putPreferences: jest.fn().mockResolvedValue(undefined) };

      const prefs = [{ $type: 'app.bsky.actor.defs#savedFeedsPrefV2' }] as unknown as BlueskyPreference[];
      await api.putPreferences('jwt', prefs);
      expect(internal.actors.putPreferences).toHaveBeenCalledWith('jwt', prefs);
    });

    it('getLabelerServices forwards dids and detailed flag', async () => {
      const { api, internal } = setupApi();
      const result = { views: [] };
      internal.actors = { getLabelerServices: jest.fn().mockResolvedValue(result) };

      await expect(api.getLabelerServices('jwt', ['did:labeler'], false)).resolves.toBe(result);
      expect(internal.actors.getLabelerServices).toHaveBeenCalledWith('jwt', ['did:labeler'], false);
    });

    it('getLabelerServices defaults detailed to true', async () => {
      const { api, internal } = setupApi();
      const result = { views: [] };
      internal.actors = { getLabelerServices: jest.fn().mockResolvedValue(result) };

      await api.getLabelerServices('jwt', ['did:labeler']);
      expect(internal.actors.getLabelerServices).toHaveBeenCalledWith('jwt', ['did:labeler'], true);
    });

    it('setPinnedPost forwards the pinned ref', async () => {
      const { api, internal } = setupApi();
      const result = { uri: 'at://profile' };
      internal.actors = { setPinnedPost: jest.fn().mockResolvedValue(result) };

      const pinned = { uri: 'at://post/1', cid: 'cid1' };
      await expect(api.setPinnedPost('jwt', 'did:example:me', pinned)).resolves.toBe(result);
      expect(internal.actors.setPinnedPost).toHaveBeenCalledWith('jwt', 'did:example:me', pinned);
    });

    it('setPinnedPost forwards null to clear the pin', async () => {
      const { api, internal } = setupApi();
      internal.actors = { setPinnedPost: jest.fn().mockResolvedValue({}) };

      await api.setPinnedPost('jwt', 'did:example:me', null);
      expect(internal.actors.setPinnedPost).toHaveBeenCalledWith('jwt', 'did:example:me', null);
    });

    it('getProfileRecord forwards jwt/userDid', async () => {
      const { api, internal } = setupApi();
      const result = { value: {} };
      internal.actors = { getProfileRecord: jest.fn().mockResolvedValue(result) };

      await expect(api.getProfileRecord('jwt', 'did:example:me')).resolves.toBe(result);
      expect(internal.actors.getProfileRecord).toHaveBeenCalledWith('jwt', 'did:example:me');
    });

    it('setLoggedOutVisibilityDiscouraged forwards the discouraged flag', async () => {
      const { api, internal } = setupApi();
      internal.actors = { setLoggedOutVisibilityDiscouraged: jest.fn().mockResolvedValue({}) };

      await api.setLoggedOutVisibilityDiscouraged('jwt', 'did:example:me', true);
      expect(internal.actors.setLoggedOutVisibilityDiscouraged).toHaveBeenCalledWith('jwt', 'did:example:me', true);
    });

    it('setAccountAutomated forwards the automated flag', async () => {
      const { api, internal } = setupApi();
      internal.actors = { setAccountAutomated: jest.fn().mockResolvedValue({}) };

      await api.setAccountAutomated('jwt', 'did:example:me', false);
      expect(internal.actors.setAccountAutomated).toHaveBeenCalledWith('jwt', 'did:example:me', false);
    });

    it('setActorStatus forwards the status input', async () => {
      const { api, internal } = setupApi();
      internal.actors = { setActorStatus: jest.fn().mockResolvedValue(undefined) };

      const input = {
        durationMinutes: 30,
        external: { uri: 'at://live', title: 'Live', description: 'desc' },
        createdAt: '2026-01-01T00:00:00Z',
      };
      await api.setActorStatus('jwt', 'did:example:me', input);
      expect(internal.actors.setActorStatus).toHaveBeenCalledWith('jwt', 'did:example:me', input);
    });

    it('clearActorStatus forwards jwt/userDid', async () => {
      const { api, internal } = setupApi();
      internal.actors = { clearActorStatus: jest.fn().mockResolvedValue(undefined) };

      await api.clearActorStatus('jwt', 'did:example:me');
      expect(internal.actors.clearActorStatus).toHaveBeenCalledWith('jwt', 'did:example:me');
    });
  });

  describe('repos delegation', () => {
    it('getActorRepos forwards limit/cursor', async () => {
      const { api, internal } = setupApi();
      const result = { records: [] } as unknown as BlueskyTangledReposResponse;
      internal.repos = { getActorRepos: jest.fn().mockResolvedValue(result) };

      await expect(api.getActorRepos('jwt', 'did:example', 25, 'c1')).resolves.toBe(result);
      expect(internal.repos.getActorRepos).toHaveBeenCalledWith('jwt', 'did:example', 25, 'c1');
    });

    it('getActorRepos defaults limit to 50 and omits cursor', async () => {
      const { api, internal } = setupApi();
      const result = { records: [] } as unknown as BlueskyTangledReposResponse;
      internal.repos = { getActorRepos: jest.fn().mockResolvedValue(result) };

      await api.getActorRepos('jwt', 'did:example');
      expect(internal.repos.getActorRepos).toHaveBeenCalledWith('jwt', 'did:example', 50, undefined);
    });

    it('getActorRecipes forwards limit/cursor', async () => {
      const { api, internal } = setupApi();
      const result = { records: [] } as unknown as BlueskyRecipeRecordsResponse;
      internal.repos = { getActorRecipes: jest.fn().mockResolvedValue(result) };

      await expect(api.getActorRecipes('jwt', 'did:example', 10, 'c2')).resolves.toBe(result);
      expect(internal.repos.getActorRecipes).toHaveBeenCalledWith('jwt', 'did:example', 10, 'c2');
    });

    it('getActorRecipes defaults limit to 50', async () => {
      const { api, internal } = setupApi();
      const result = { records: [] } as unknown as BlueskyRecipeRecordsResponse;
      internal.repos = { getActorRecipes: jest.fn().mockResolvedValue(result) };

      await api.getActorRecipes('jwt', 'did:example');
      expect(internal.repos.getActorRecipes).toHaveBeenCalledWith('jwt', 'did:example', 50, undefined);
    });
  });

  describe('grain delegation', () => {
    it('getActorGalleries -> grain.getActorGalleries with explicit args', async () => {
      const { api, internal } = setupApi();
      const result = { records: [] };
      internal.grain = { getActorGalleries: jest.fn().mockResolvedValue(result) };

      await expect(api.getActorGalleries('jwt', 'did:example', 20, 'c1')).resolves.toBe(result);
      expect(internal.grain.getActorGalleries).toHaveBeenCalledWith('jwt', 'did:example', 20, 'c1');
    });

    it('getActorGalleries defaults limit to 50', async () => {
      const { api, internal } = setupApi();
      internal.grain = { getActorGalleries: jest.fn().mockResolvedValue({ records: [] }) };

      await api.getActorGalleries('jwt', 'did:example');
      expect(internal.grain.getActorGalleries).toHaveBeenCalledWith('jwt', 'did:example', 50, undefined);
    });

    it('getActorGrainPhotos -> grain.getActorPhotos (default limit 50)', async () => {
      const { api, internal } = setupApi();
      const result = { records: [] };
      internal.grain = { getActorPhotos: jest.fn().mockResolvedValue(result) };

      await expect(api.getActorGrainPhotos('jwt', 'did:example')).resolves.toBe(result);
      expect(internal.grain.getActorPhotos).toHaveBeenCalledWith('jwt', 'did:example', 50, undefined);
    });

    it('getActorGrainPhotos forwards explicit limit/cursor', async () => {
      const { api, internal } = setupApi();
      internal.grain = { getActorPhotos: jest.fn().mockResolvedValue({ records: [] }) };

      await api.getActorGrainPhotos('jwt', 'did:example', 5, 'c3');
      expect(internal.grain.getActorPhotos).toHaveBeenCalledWith('jwt', 'did:example', 5, 'c3');
    });

    it('getActorGrainGalleryItems -> grain.getActorGalleryItems (default limit 100)', async () => {
      const { api, internal } = setupApi();
      const result = { records: [] };
      internal.grain = { getActorGalleryItems: jest.fn().mockResolvedValue(result) };

      await expect(api.getActorGrainGalleryItems('jwt', 'did:example')).resolves.toBe(result);
      expect(internal.grain.getActorGalleryItems).toHaveBeenCalledWith('jwt', 'did:example', 100, undefined);
    });

    it('getActorGrainGalleryItems forwards explicit limit/cursor', async () => {
      const { api, internal } = setupApi();
      internal.grain = { getActorGalleryItems: jest.fn().mockResolvedValue({ records: [] }) };

      await api.getActorGrainGalleryItems('jwt', 'did:example', 7, 'c4');
      expect(internal.grain.getActorGalleryItems).toHaveBeenCalledWith('jwt', 'did:example', 7, 'c4');
    });

    it('getActorGrainPhotoExif -> grain.getActorPhotoExif (default limit 100)', async () => {
      const { api, internal } = setupApi();
      const result = { records: [] };
      internal.grain = { getActorPhotoExif: jest.fn().mockResolvedValue(result) };

      await expect(api.getActorGrainPhotoExif('jwt', 'did:example')).resolves.toBe(result);
      expect(internal.grain.getActorPhotoExif).toHaveBeenCalledWith('jwt', 'did:example', 100, undefined);
    });

    it('getActorGrainPhotoExif forwards explicit limit/cursor', async () => {
      const { api, internal } = setupApi();
      internal.grain = { getActorPhotoExif: jest.fn().mockResolvedValue({ records: [] }) };

      await api.getActorGrainPhotoExif('jwt', 'did:example', 9, 'c5');
      expect(internal.grain.getActorPhotoExif).toHaveBeenCalledWith('jwt', 'did:example', 9, 'c5');
    });
  });

  describe('flashes / spark delegation', () => {
    it('getActorFlashesStories -> flashes.getActorStories (default limit 50)', async () => {
      const { api, internal } = setupApi();
      const result = { records: [] };
      internal.flashes = { getActorStories: jest.fn().mockResolvedValue(result) };

      await expect(api.getActorFlashesStories('jwt', 'did:example')).resolves.toBe(result);
      expect(internal.flashes.getActorStories).toHaveBeenCalledWith('jwt', 'did:example', 50, undefined);
    });

    it('getActorFlashesStories forwards explicit limit/cursor', async () => {
      const { api, internal } = setupApi();
      internal.flashes = { getActorStories: jest.fn().mockResolvedValue({ records: [] }) };

      await api.getActorFlashesStories('jwt', 'did:example', 12, 'c6');
      expect(internal.flashes.getActorStories).toHaveBeenCalledWith('jwt', 'did:example', 12, 'c6');
    });

    it('getActorSparkStories -> spark.getActorStories (default limit 50)', async () => {
      const { api, internal } = setupApi();
      const result = { records: [] };
      internal.spark = { getActorStories: jest.fn().mockResolvedValue(result) };

      await expect(api.getActorSparkStories('jwt', 'did:example')).resolves.toBe(result);
      expect(internal.spark.getActorStories).toHaveBeenCalledWith('jwt', 'did:example', 50, undefined);
    });

    it('getActorSparkStories forwards explicit limit/cursor', async () => {
      const { api, internal } = setupApi();
      internal.spark = { getActorStories: jest.fn().mockResolvedValue({ records: [] }) };

      await api.getActorSparkStories('jwt', 'did:example', 3, 'c7');
      expect(internal.spark.getActorStories).toHaveBeenCalledWith('jwt', 'did:example', 3, 'c7');
    });
  });

  describe('poll delegation', () => {
    it('createPoll -> poll.createPoll', async () => {
      const { api, internal } = setupApi();
      const result = { uri: 'at://poll/1', cid: 'cid1' };
      internal.poll = { createPoll: jest.fn().mockResolvedValue(result) };

      const input = { options: ['a', 'b'], endsAt: '2026-02-01T00:00:00Z' };
      await expect(api.createPoll('jwt', 'did:example:me', input)).resolves.toBe(result);
      expect(internal.poll.createPoll).toHaveBeenCalledWith('jwt', 'did:example:me', input);
    });

    it('createPollVote -> poll.createVote', async () => {
      const { api, internal } = setupApi();
      const result = { uri: 'at://vote/1', cid: 'cid2' };
      internal.poll = { createVote: jest.fn().mockResolvedValue(result) };

      const input = { poll: { uri: 'at://poll/1', cid: 'cid1' }, optionIndex: 1 };
      await expect(api.createPollVote('jwt', 'did:example:me', input)).resolves.toBe(result);
      expect(internal.poll.createVote).toHaveBeenCalledWith('jwt', 'did:example:me', input);
    });
  });

  describe('rpg delegation', () => {
    it('getActorRpgInventory -> rpg.getActorInventory (default limit 50)', async () => {
      const { api, internal } = setupApi();
      const result = { records: [] };
      internal.rpg = { getActorInventory: jest.fn().mockResolvedValue(result) };

      await expect(api.getActorRpgInventory('jwt', 'did:example')).resolves.toBe(result);
      expect(internal.rpg.getActorInventory).toHaveBeenCalledWith('jwt', 'did:example', 50, undefined);
    });

    it('getActorRpgInventory forwards explicit limit/cursor', async () => {
      const { api, internal } = setupApi();
      internal.rpg = { getActorInventory: jest.fn().mockResolvedValue({ records: [] }) };

      await api.getActorRpgInventory('jwt', 'did:example', 8, 'c8');
      expect(internal.rpg.getActorInventory).toHaveBeenCalledWith('jwt', 'did:example', 8, 'c8');
    });
  });

  describe('sifa delegation', () => {
    it('getSifaProfileSelf -> sifa.getProfileSelf', async () => {
      const { api, internal } = setupApi();
      const result = { value: {} };
      internal.sifa = { getProfileSelf: jest.fn().mockResolvedValue(result) };

      await expect(api.getSifaProfileSelf('jwt', 'did:example')).resolves.toBe(result);
      expect(internal.sifa.getProfileSelf).toHaveBeenCalledWith('jwt', 'did:example');
    });

    it('getSifaProfileSelf can resolve null', async () => {
      const { api, internal } = setupApi();
      internal.sifa = { getProfileSelf: jest.fn().mockResolvedValue(null) };

      await expect(api.getSifaProfileSelf('jwt', 'did:example')).resolves.toBeNull();
      expect(internal.sifa.getProfileSelf).toHaveBeenCalledWith('jwt', 'did:example');
    });

    it('getActorSifaPositions -> sifa.getActorPositions (default limit 50)', async () => {
      const { api, internal } = setupApi();
      const result = { records: [] };
      internal.sifa = { getActorPositions: jest.fn().mockResolvedValue(result) };

      await expect(api.getActorSifaPositions('jwt', 'did:example')).resolves.toBe(result);
      expect(internal.sifa.getActorPositions).toHaveBeenCalledWith('jwt', 'did:example', 50, undefined);
    });

    it('getActorSifaPositions forwards explicit limit/cursor', async () => {
      const { api, internal } = setupApi();
      internal.sifa = { getActorPositions: jest.fn().mockResolvedValue({ records: [] }) };

      await api.getActorSifaPositions('jwt', 'did:example', 6, 'c9');
      expect(internal.sifa.getActorPositions).toHaveBeenCalledWith('jwt', 'did:example', 6, 'c9');
    });

    it('getActorSifaEducation -> sifa.getActorEducation (default limit 50)', async () => {
      const { api, internal } = setupApi();
      const result = { records: [] };
      internal.sifa = { getActorEducation: jest.fn().mockResolvedValue(result) };

      await expect(api.getActorSifaEducation('jwt', 'did:example')).resolves.toBe(result);
      expect(internal.sifa.getActorEducation).toHaveBeenCalledWith('jwt', 'did:example', 50, undefined);
    });

    it('getActorSifaEducation forwards explicit limit/cursor', async () => {
      const { api, internal } = setupApi();
      internal.sifa = { getActorEducation: jest.fn().mockResolvedValue({ records: [] }) };

      await api.getActorSifaEducation('jwt', 'did:example', 4, 'c10');
      expect(internal.sifa.getActorEducation).toHaveBeenCalledWith('jwt', 'did:example', 4, 'c10');
    });
  });
});
