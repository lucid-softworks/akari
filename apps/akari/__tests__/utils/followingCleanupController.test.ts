import { QueryClient } from '@tanstack/react-query';

import type { BlueskyProfile } from '@/bluesky-api';

const mockIsRateLimitError = jest.fn();

jest.mock('@/bluesky-api', () => ({
  isRateLimitError: (...args: unknown[]) => mockIsRateLimitError(...args),
}));

import {
  followingCleanupQueryKey,
  getFollowingCleanupController,
  initialFollowingCleanupState,
} from '@/utils/followingCleanupController';

type AnyController = {
  getState: () => ReturnType<typeof initialFollowingCleanupState>;
  start: (creds: { api: unknown; token: string }) => Promise<void>;
  pause: () => void;
  clear: () => void;
  removeProfile: (did: string) => void;
  restoreEntry: (entry: unknown) => void;
};

const ACCOUNT_DID = 'did:plc:me';

function makeProfile(overrides: Partial<BlueskyProfile> & { did: string }): BlueskyProfile {
  return {
    handle: `${overrides.did}.test`,
    ...overrides,
  } as unknown as BlueskyProfile;
}

function makeFeedItem(opts: { postIndexedAt?: string; reasonIndexedAt?: string } = {}) {
  return {
    post: opts.postIndexedAt ? { indexedAt: opts.postIndexedAt } : undefined,
    reason: opts.reasonIndexedAt ? { indexedAt: opts.reasonIndexedAt } : undefined,
  };
}

/**
 * Build a mock BlueskyApi. By default everything paginates a single page and
 * then reports done (no cursor), so a `start()` call completes promptly.
 */
function makeApi(over: Partial<Record<string, jest.Mock>> = {}) {
  return {
    getFollows: jest.fn().mockResolvedValue({ follows: [], cursor: undefined }),
    listFollowRecords: jest.fn().mockResolvedValue({ records: [], cursor: undefined }),
    getProfiles: jest.fn().mockResolvedValue({ profiles: [] }),
    getAuthorFeed: jest.fn().mockResolvedValue({ feed: [] }),
    ...over,
  };
}

function makeController(api: ReturnType<typeof makeApi>, did = ACCOUNT_DID) {
  // Use a unique account DID per controller so the module-level registry
  // doesn't hand back a controller from a previous test with stale state.
  const queryClient = new QueryClient();
  const setSpy = jest.spyOn(queryClient, 'setQueryData');
  const ctrl = getFollowingCleanupController(queryClient, did) as unknown as AnyController;
  return { ctrl, queryClient, setSpy, creds: { api, token: 'tok' } };
}

let uniqueCounter = 0;
function uniqueDid() {
  uniqueCounter += 1;
  return `did:plc:acct-${uniqueCounter}`;
}

let warnSpy: jest.SpyInstance;

beforeEach(() => {
  // jest.setup.js enables fake timers globally, but this controller leans on
  // real setTimeout/setInterval polling to interleave its concurrent
  // producers and workers. Run these tests against real timers.
  jest.useRealTimers();
  jest.clearAllMocks();
  mockIsRateLimitError.mockReturnValue(false);
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('followingCleanupQueryKey', () => {
  it('builds a stable key with the account did', () => {
    expect(followingCleanupQueryKey('did:plc:x')).toEqual(['followingCleanup', 'did:plc:x']);
  });

  it('handles an undefined did', () => {
    expect(followingCleanupQueryKey(undefined)).toEqual(['followingCleanup', undefined]);
  });
});

describe('initialFollowingCleanupState', () => {
  it('returns a fresh idle state', () => {
    expect(initialFollowingCleanupState()).toEqual({
      entries: {},
      totalDiscovered: 0,
      totalScanned: 0,
      paginationDone: false,
      runState: 'idle',
    });
  });

  it('returns a new object each call', () => {
    expect(initialFollowingCleanupState()).not.toBe(initialFollowingCleanupState());
  });
});

describe('getFollowingCleanupController', () => {
  it('returns the same instance for the same account did', () => {
    const qc = new QueryClient();
    const a = getFollowingCleanupController(qc, 'did:plc:reuse');
    const b = getFollowingCleanupController(qc, 'did:plc:reuse');
    expect(a).toBe(b);
  });

  it('returns different instances for different account dids', () => {
    const qc = new QueryClient();
    const a = getFollowingCleanupController(qc, 'did:plc:one');
    const b = getFollowingCleanupController(qc, 'did:plc:two');
    expect(a).not.toBe(b);
  });

  it('exposes an idle initial state', () => {
    const qc = new QueryClient();
    const ctrl = getFollowingCleanupController(qc, 'did:plc:fresh') as unknown as AnyController;
    expect(ctrl.getState().runState).toBe('idle');
  });
});

describe('FollowingCleanupController.start (happy path)', () => {
  it('discovers, enriches and scans a single follow then completes', async () => {
    const did = uniqueDid();
    const target = 'did:plc:target';
    const profile = makeProfile({ did: target });
    const detailed = makeProfile({ did: target, followersCount: 10 });
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockResolvedValueOnce({ follows: [profile], cursor: undefined }),
      listFollowRecords: jest.fn().mockResolvedValueOnce({
        records: [{ value: { subject: target, createdAt: '2024-01-01T00:00:00Z' } }],
        cursor: undefined,
      }),
      getProfiles: jest.fn().mockResolvedValueOnce({ profiles: [detailed] }),
      getAuthorFeed: jest.fn().mockResolvedValue({
        feed: [makeFeedItem({ postIndexedAt: '2025-05-05T00:00:00Z' })],
      }),
    });
    const { ctrl, setSpy } = makeController(api, did);

    await ctrl.start({ api, token: 'tok' });

    const state = ctrl.getState();
    expect(state.runState).toBe('completed');
    expect(state.paginationDone).toBe(true);
    expect(state.totalDiscovered).toBe(1);
    expect(state.totalScanned).toBe(1);
    const entry = state.entries[target];
    expect(entry.status).toBe('done');
    expect(entry.lastActivityAt).toBe('2025-05-05T00:00:00Z');
    expect(entry.followedAt).toBe('2024-01-01T00:00:00Z');
    expect(entry.profile.followersCount).toBe(10);
    // flush writes state to the query cache
    expect(setSpy).toHaveBeenCalledWith(
      followingCleanupQueryKey(did),
      expect.objectContaining({ runState: expect.any(String) }),
    );
  });

  it('prefers the reason.indexedAt (repost) over the post indexedAt', async () => {
    const did = uniqueDid();
    const target = 'did:plc:repost';
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockResolvedValueOnce({ follows: [makeProfile({ did: target })], cursor: undefined }),
      getAuthorFeed: jest.fn().mockResolvedValue({
        feed: [
          makeFeedItem({
            postIndexedAt: '2020-01-01T00:00:00Z',
            reasonIndexedAt: '2025-09-09T00:00:00Z',
          }),
        ],
      }),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    expect(ctrl.getState().entries[target].lastActivityAt).toBe('2025-09-09T00:00:00Z');
  });

  it('retries an empty author feed without the filter and records null activity', async () => {
    const did = uniqueDid();
    const target = 'did:plc:empty';
    const getAuthorFeed = jest
      .fn()
      .mockResolvedValueOnce({ feed: [] })
      .mockResolvedValueOnce({ feed: [] });
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockResolvedValueOnce({ follows: [makeProfile({ did: target })], cursor: undefined }),
      getAuthorFeed,
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });

    expect(getAuthorFeed).toHaveBeenCalledTimes(2);
    // second call is the unfiltered retry (only 3 args)
    expect(getAuthorFeed.mock.calls[1]).toEqual(['tok', target, 3]);
    const entry = ctrl.getState().entries[target];
    expect(entry.status).toBe('done');
    expect(entry.lastActivityAt).toBeNull();
  });

  it('paginates multiple follows pages via the cursor', async () => {
    const did = uniqueDid();
    const p1 = makeProfile({ did: 'did:plc:p1' });
    const p2 = makeProfile({ did: 'did:plc:p2' });
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockResolvedValueOnce({ follows: [p1], cursor: 'next' })
        .mockResolvedValueOnce({ follows: [p2], cursor: undefined }),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });

    const state = ctrl.getState();
    expect(state.totalDiscovered).toBe(2);
    expect(Object.keys(state.entries).toSorted()).toEqual(['did:plc:p1', 'did:plc:p2']);
    // cursor was threaded into the second call
    expect(api.getFollows.mock.calls[1][3]).toBe('next');
  });

  it('skips follows that were already discovered', async () => {
    const did = uniqueDid();
    const dup = makeProfile({ did: 'did:plc:dup' });
    const api = makeApi({
      getFollows: jest.fn().mockResolvedValueOnce({ follows: [dup, dup], cursor: undefined }),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    expect(ctrl.getState().totalDiscovered).toBe(1);
  });

  it('is a no-op when called while already running', async () => {
    const did = uniqueDid();
    const target = 'did:plc:slow';
    let resolveFollows: (v: unknown) => void = () => {};
    const api = makeApi({
      getFollows: jest.fn().mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFollows = resolve;
          }),
      ),
    });
    const { ctrl } = makeController(api, did);
    const first = ctrl.start({ api, token: 'tok' });
    // second call should return immediately without launching new producers
    await ctrl.start({ api, token: 'tok' });
    expect(ctrl.getState().runState).toBe('running');
    resolveFollows({ follows: [makeProfile({ did: target })], cursor: undefined });
    await first;
    expect(ctrl.getState().runState).toBe('completed');
    expect(api.getFollows).toHaveBeenCalledTimes(1);
  });
});

describe('FollowingCleanupController.start (follow records producer)', () => {
  it('stashes orphan followedAt then attaches it when the profile is discovered', async () => {
    const did = uniqueDid();
    const target = 'did:plc:orphan';
    // listFollowRecords resolves first (before getFollows) so the date is orphaned.
    let releaseFollows: (v: unknown) => void = () => {};
    const api = makeApi({
      getFollows: jest.fn().mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseFollows = resolve;
          }),
      ),
      listFollowRecords: jest.fn().mockResolvedValueOnce({
        records: [{ value: { subject: target, createdAt: '2023-03-03T00:00:00Z' } }],
        cursor: undefined,
      }),
    });
    const { ctrl } = makeController(api, did);
    const run = ctrl.start({ api, token: 'tok' });
    // let the records producer run and stash the orphan date
    await Promise.resolve();
    await Promise.resolve();
    releaseFollows({ follows: [makeProfile({ did: target })], cursor: undefined });
    await run;
    expect(ctrl.getState().entries[target].followedAt).toBe('2023-03-03T00:00:00Z');
  });

  it('ignores records missing a subject or createdAt', async () => {
    const did = uniqueDid();
    const api = makeApi({
      listFollowRecords: jest.fn().mockResolvedValueOnce({
        records: [
          { value: { subject: undefined, createdAt: '2023-01-01T00:00:00Z' } },
          { value: { subject: 'did:plc:nope', createdAt: undefined } },
          { value: undefined },
        ],
        cursor: undefined,
      }),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    expect(ctrl.getState().entries).toEqual({});
  });

  it('paginates follow records via cursor', async () => {
    const did = uniqueDid();
    const api = makeApi({
      listFollowRecords: jest
        .fn()
        .mockResolvedValueOnce({ records: [], cursor: 'r2' })
        .mockResolvedValueOnce({ records: [], cursor: undefined }),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    expect(api.listFollowRecords).toHaveBeenCalledTimes(2);
    expect(api.listFollowRecords.mock.calls[1][3]).toBe('r2');
  });
});

describe('FollowingCleanupController.start (profiles enrichment)', () => {
  it('merges detailed profile data while preserving the viewer.following uri', async () => {
    const did = uniqueDid();
    const target = 'did:plc:merge';
    const lightweight = makeProfile({
      did: target,
      viewer: { following: 'at://follow/1' },
    } as Partial<BlueskyProfile> & { did: string });
    const detailed = makeProfile({
      did: target,
      followersCount: 5,
      viewer: { muted: false },
    } as Partial<BlueskyProfile> & { did: string });
    const api = makeApi({
      getFollows: jest.fn().mockResolvedValueOnce({ follows: [lightweight], cursor: undefined }),
      getProfiles: jest.fn().mockResolvedValueOnce({ profiles: [detailed] }),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    const merged = ctrl.getState().entries[target].profile;
    expect(merged.followersCount).toBe(5);
    expect((merged.viewer as { following?: string }).following).toBe('at://follow/1');
    expect((merged.viewer as { muted?: boolean }).muted).toBe(false);
  });

  it('ignores detailed entries without a did and unknown dids', async () => {
    const did = uniqueDid();
    const target = 'did:plc:known';
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockResolvedValueOnce({ follows: [makeProfile({ did: target })], cursor: undefined }),
      getProfiles: jest.fn().mockResolvedValueOnce({
        profiles: [
          undefined,
          { did: undefined },
          makeProfile({ did: 'did:plc:stranger', followersCount: 99 }),
        ],
      }),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    // stranger never discovered -> not in entries; known stays without counts
    expect(ctrl.getState().entries['did:plc:stranger']).toBeUndefined();
    expect(ctrl.getState().entries[target].profile.followersCount).toBeUndefined();
  });
});

describe('FollowingCleanupController.start (error handling)', () => {
  it('retries getFollows on a non-rate-limit error and logs a warning', async () => {
    const did = uniqueDid();
    mockIsRateLimitError.mockReturnValue(false);
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ follows: [], cursor: undefined }),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    expect(api.getFollows).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('does not warn for getFollows rate-limit errors', async () => {
    const did = uniqueDid();
    mockIsRateLimitError.mockReturnValue(true);
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockRejectedValueOnce(new Error('429'))
        .mockResolvedValueOnce({ follows: [], cursor: undefined }),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    expect(api.getFollows).toHaveBeenCalledTimes(2);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('retries listFollowRecords on a non-rate-limit error', async () => {
    const did = uniqueDid();
    const api = makeApi({
      listFollowRecords: jest
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ records: [], cursor: undefined }),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    expect(api.listFollowRecords).toHaveBeenCalledTimes(2);
  });

  it('re-queues a getProfiles batch on error and retries', async () => {
    const did = uniqueDid();
    const target = 'did:plc:retryprofile';
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockResolvedValueOnce({ follows: [makeProfile({ did: target })], cursor: undefined }),
      getProfiles: jest
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({
          profiles: [makeProfile({ did: target, followersCount: 7 })],
        }),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    expect(api.getProfiles.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(ctrl.getState().entries[target].profile.followersCount).toBe(7);
  });

  it('marks an entry as error on a non-rate-limit author feed failure', async () => {
    const did = uniqueDid();
    const target = 'did:plc:feederr';
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockResolvedValueOnce({ follows: [makeProfile({ did: target })], cursor: undefined }),
      getAuthorFeed: jest.fn().mockRejectedValue(new Error('feed boom')),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    const entry = ctrl.getState().entries[target];
    expect(entry.status).toBe('error');
    expect(ctrl.getState().totalScanned).toBe(1);
  });

  it('requeues a rate-limited author feed scan without counting it', async () => {
    const did = uniqueDid();
    const target = 'did:plc:feedrl';
    // first author feed call rate-limits, second succeeds
    mockIsRateLimitError.mockImplementation((err: unknown) => (err as Error).message === 'rl');
    const getAuthorFeed = jest
      .fn()
      .mockRejectedValueOnce(new Error('rl'))
      .mockResolvedValue({ feed: [makeFeedItem({ postIndexedAt: '2025-01-01T00:00:00Z' })] });
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockResolvedValueOnce({ follows: [makeProfile({ did: target })], cursor: undefined }),
      getAuthorFeed,
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    const entry = ctrl.getState().entries[target];
    expect(entry.status).toBe('done');
    // scanned only once despite the rate-limit requeue
    expect(ctrl.getState().totalScanned).toBe(1);
    expect(getAuthorFeed.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('FollowingCleanupController.start (credential guards)', () => {
  it('completes immediately when start runs but producers find no creds set internally', async () => {
    // Sanity: a normal empty run still completes.
    const did = uniqueDid();
    const api = makeApi();
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    expect(ctrl.getState().runState).toBe('completed');
  });
});

describe('FollowingCleanupController.start (resume after completion)', () => {
  it('wipes state and rescans when start is called again after completion', async () => {
    const did = uniqueDid();
    const target = 'did:plc:rescan';
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockResolvedValue({ follows: [makeProfile({ did: target })], cursor: undefined }),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    expect(ctrl.getState().runState).toBe('completed');
    expect(ctrl.getState().totalDiscovered).toBe(1);

    // Second run: completed state is wiped and rebuilt.
    await ctrl.start({ api, token: 'tok' });
    expect(ctrl.getState().runState).toBe('completed');
    expect(ctrl.getState().totalDiscovered).toBe(1);
    expect(ctrl.getState().totalScanned).toBe(1);
  });
});

describe('FollowingCleanupController.pause', () => {
  it('surfaces paused immediately when idle but data exists', async () => {
    const did = uniqueDid();
    const target = 'did:plc:pausable';
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockResolvedValueOnce({ follows: [makeProfile({ did: target })], cursor: undefined }),
    });
    const { ctrl, setSpy } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    setSpy.mockClear();
    ctrl.pause();
    expect(ctrl.getState().runState).toBe('paused');
    expect(setSpy).toHaveBeenCalled();
  });

  it('does nothing when idle with no discovered data', () => {
    const did = uniqueDid();
    const { ctrl, setSpy } = makeController(makeApi(), did);
    ctrl.pause();
    expect(ctrl.getState().runState).toBe('idle');
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('requests a graceful stop while running and ends in the paused state', async () => {
    const did = uniqueDid();
    const target = 'did:plc:running';
    let releaseFollows: (v: unknown) => void = () => {};
    const api = makeApi({
      getFollows: jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            releaseFollows = resolve;
          }),
      ),
    });
    const { ctrl } = makeController(api, did);
    const run = ctrl.start({ api, token: 'tok' });
    await Promise.resolve();
    ctrl.pause();
    expect(ctrl.getState().runState).toBe('paused');
    // unblock the in-flight getFollows so producers can observe pauseRequested
    releaseFollows({ follows: [makeProfile({ did: target })], cursor: 'more' });
    await run;
    expect(ctrl.getState().runState).toBe('paused');
  });

  it('resumes a paused scan, re-enqueuing pending entries', async () => {
    const did = uniqueDid();
    const target = 'did:plc:resumeme';
    let releaseFollows: (v: unknown) => void = () => {};
    const api = makeApi({
      getFollows: jest.fn().mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseFollows = resolve;
          }),
      ),
      getAuthorFeed: jest
        .fn()
        .mockResolvedValue({ feed: [makeFeedItem({ postIndexedAt: '2025-02-02T00:00:00Z' })] }),
    });
    const { ctrl } = makeController(api, did);
    const run = ctrl.start({ api, token: 'tok' });
    await Promise.resolve();
    ctrl.pause();
    // page comes back with a cursor (pagination not done) but pauseRequested halts it
    releaseFollows({ follows: [makeProfile({ did: target })], cursor: 'next' });
    await run;
    expect(ctrl.getState().runState).toBe('paused');

    // Resume: producer now returns a final page and workers drain the queue.
    api.getFollows.mockResolvedValue({ follows: [], cursor: undefined });
    await ctrl.start({ api, token: 'tok' });
    expect(ctrl.getState().runState).toBe('completed');
    expect(ctrl.getState().entries[target].status).toBe('done');
  });
});

describe('FollowingCleanupController.clear', () => {
  it('resets all state to the initial idle state', async () => {
    const did = uniqueDid();
    const target = 'did:plc:clearme';
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockResolvedValueOnce({ follows: [makeProfile({ did: target })], cursor: undefined }),
    });
    const { ctrl, setSpy } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    expect(ctrl.getState().totalDiscovered).toBe(1);
    setSpy.mockClear();
    ctrl.clear();
    expect(ctrl.getState()).toEqual(initialFollowingCleanupState());
    expect(setSpy).toHaveBeenCalled();
  });
});

describe('FollowingCleanupController.removeProfile', () => {
  it('removes an existing entry and flushes', async () => {
    const did = uniqueDid();
    const target = 'did:plc:removeme';
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockResolvedValueOnce({ follows: [makeProfile({ did: target })], cursor: undefined }),
    });
    const { ctrl, setSpy } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    setSpy.mockClear();
    ctrl.removeProfile(target);
    expect(ctrl.getState().entries[target]).toBeUndefined();
    expect(setSpy).toHaveBeenCalled();
  });

  it('is a no-op for an unknown did', () => {
    const did = uniqueDid();
    const { ctrl, setSpy } = makeController(makeApi(), did);
    ctrl.removeProfile('did:plc:ghost');
    expect(setSpy).not.toHaveBeenCalled();
  });
});

describe('FollowingCleanupController.restoreEntry', () => {
  it('re-inserts a previously removed entry', () => {
    const did = uniqueDid();
    const { ctrl, setSpy } = makeController(makeApi(), did);
    const entry = {
      profile: makeProfile({ did: 'did:plc:restored' }),
      status: 'done' as const,
      lastActivityAt: '2025-01-01T00:00:00Z',
      followedAt: null,
    };
    ctrl.restoreEntry(entry);
    expect(ctrl.getState().entries['did:plc:restored']).toBe(entry);
    expect(setSpy).toHaveBeenCalled();
  });

  it('does not overwrite an entry that already exists', async () => {
    const did = uniqueDid();
    const target = 'did:plc:exists';
    const api = makeApi({
      getFollows: jest
        .fn()
        .mockResolvedValueOnce({ follows: [makeProfile({ did: target })], cursor: undefined }),
    });
    const { ctrl } = makeController(api, did);
    await ctrl.start({ api, token: 'tok' });
    const original = ctrl.getState().entries[target];
    ctrl.restoreEntry({
      profile: makeProfile({ did: target }),
      status: 'pending',
      lastActivityAt: null,
      followedAt: null,
    });
    expect(ctrl.getState().entries[target]).toBe(original);
  });
});
