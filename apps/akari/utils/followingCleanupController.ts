import type { QueryClient } from '@tanstack/react-query';

import { isRateLimitError } from '@/bluesky-api';
import type { BlueskyApi, BlueskyFeedItem, BlueskyProfile } from '@/bluesky-api';

// atproto PDS rate limits are typically 3000 requests per 5 minutes
// (10/s sustained). With multiple concurrent workers we'll naturally
// exceed that, but the client's pre-fetch awaitRateLimit gates the
// next call after each 429, so we stay polite without hand-tuning.
const SCAN_CONCURRENCY = 4;
const FLUSH_INTERVAL_MS = 200;
const PROFILES_BATCH_SIZE = 25;
const PROFILES_WORKERS = 2;

export type FollowingCleanupRunState = 'idle' | 'running' | 'paused' | 'completed';

export type FollowingCleanupEntry = {
  profile: BlueskyProfile;
  status: 'pending' | 'scanning' | 'done' | 'error';
  lastActivityAt: string | null;
  /**
   * When the user's follow record was created — populated by a separate
   * `listRecords` pass running alongside the author-feed scan. May lag a
   * little behind the entry being created (so a row can appear in the
   * results list with `null` here for a beat).
   */
  followedAt: string | null;
};

export type FollowingCleanupState = {
  entries: Record<string, FollowingCleanupEntry>;
  totalDiscovered: number;
  totalScanned: number;
  paginationDone: boolean;
  runState: FollowingCleanupRunState;
};

const initialState = (): FollowingCleanupState => ({
  entries: {},
  totalDiscovered: 0,
  totalScanned: 0,
  paginationDone: false,
  runState: 'idle',
});

export function followingCleanupQueryKey(accountDid: string | undefined) {
  return ['followingCleanup', accountDid] as const;
}

type CredentialBundle = {
  api: BlueskyApi;
  token: string;
};

class FollowingCleanupController {
  private state = initialState();
  private queue: BlueskyProfile[] = [];
  private cursor: string | undefined = undefined;
  /** Cursor for the parallel listRecords producer. */
  private followRecordsCursor: string | undefined = undefined;
  private followRecordsDone = false;
  /** Pending followedAt values for profiles we haven't discovered yet. */
  private orphanFollowedAt: Map<string, string> = new Map();
  /** DIDs queued for the getProfiles enrichment pass. */
  private profilesQueue: string[] = [];
  /** DIDs already enriched with detailed view (followers/follows/posts). */
  private profilesEnriched: Set<string> = new Set();
  private creds: CredentialBundle | null = null;
  private running = false;
  private pauseRequested = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly queryClient: QueryClient,
    private readonly accountDid: string,
  ) {}

  getState(): FollowingCleanupState {
    return this.state;
  }

  /**
   * Begin or resume a scan. Safe to call repeatedly — no-ops if already
   * running. Updates credentials in case the JWT was refreshed between
   * pause and resume.
   */
  async start(creds: CredentialBundle) {
    this.creds = creds;
    if (this.running) return;
    if (this.state.runState === 'completed') {
      // Completed scans are immutable; calling start() again means "rescan
      // from scratch" so we wipe before re-entering the worker loop.
      this.state = initialState();
      this.queue = [];
      this.cursor = undefined;
      this.followRecordsCursor = undefined;
      this.followRecordsDone = false;
      this.orphanFollowedAt = new Map();
      this.profilesQueue = [];
      this.profilesEnriched = new Set();
    }

    this.running = true;
    this.pauseRequested = false;
    this.state = { ...this.state, runState: 'running' };
    this.startFlushing();

    // Rebuild the queue from any entries that were left pending or were
    // scanning when we paused. This is what makes resume cheap. Patch in
    // followedAt for any older entries that predate that field being
    // captured (or were resumed before listRecords reached them).
    this.queue = [];
    this.profilesQueue = [];
    for (const did of Object.keys(this.state.entries)) {
      const entry = this.state.entries[did];
      if (entry.followedAt === undefined) entry.followedAt = null;
      if (entry.status === 'pending' || entry.status === 'scanning') {
        entry.status = 'pending';
        this.queue.push(entry.profile);
      }
      // Re-enqueue for enrichment if we still don't have detailed counts.
      if (!this.profilesEnriched.has(did) && entry.profile.followersCount === undefined) {
        this.profilesQueue.push(did);
      }
    }

    try {
      await Promise.all([
        this.producer(),
        this.followRecordsProducer(),
        ...Array.from({ length: PROFILES_WORKERS }, () => this.profilesWorker()),
        ...Array.from({ length: SCAN_CONCURRENCY }, () => this.worker()),
      ]);
    } finally {
      this.running = false;
      const completed = this.state.paginationDone && this.queue.length === 0 && !this.pauseRequested;
      this.state = {
        ...this.state,
        runState: this.pauseRequested ? 'paused' : completed ? 'completed' : 'paused',
      };
      this.stopFlushing();
    }
  }

  /** Request a graceful stop; preserves all collected state for resume. */
  pause() {
    if (!this.running) {
      // Already idle — surface the paused state directly so the UI updates.
      if (this.state.totalDiscovered > 0) {
        this.state = { ...this.state, runState: 'paused' };
        this.flush();
      }
      return;
    }
    this.pauseRequested = true;
    this.state = { ...this.state, runState: 'paused' };
    this.flush();
  }

  /** Discard all collected state. Will pause first if a scan is in flight. */
  clear() {
    this.pauseRequested = true;
    this.queue = [];
    this.cursor = undefined;
    this.followRecordsCursor = undefined;
    this.followRecordsDone = false;
    this.orphanFollowedAt = new Map();
    this.profilesQueue = [];
    this.profilesEnriched = new Set();
    this.state = initialState();
    this.flush();
  }

  /** Remove a single profile from the cached results (e.g. after unfollow). */
  removeProfile(did: string) {
    if (!this.state.entries[did]) return;
    const nextEntries = { ...this.state.entries };
    delete nextEntries[did];
    this.state = { ...this.state, entries: nextEntries };
    this.flush();
  }

  /**
   * Re-insert a previously-removed entry. Used to roll back an optimistic
   * unfollow when the server call fails so the row reappears.
   */
  restoreEntry(entry: FollowingCleanupEntry) {
    if (this.state.entries[entry.profile.did]) return;
    this.state = {
      ...this.state,
      entries: { ...this.state.entries, [entry.profile.did]: entry },
    };
    this.flush();
  }

  private startFlushing() {
    if (this.flushTimer) return;
    this.flush();
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  private stopFlushing() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  private flush() {
    this.queryClient.setQueryData(followingCleanupQueryKey(this.accountDid), {
      ...this.state,
      entries: { ...this.state.entries },
    });
  }

  private async producer() {
    if (this.state.paginationDone || !this.creds) return;
    const { api, token } = this.creds;
    while (!this.pauseRequested) {
      let page;
      try {
        page = await api.getFollows(token, this.accountDid, 100, this.cursor);
      } catch (err) {
        // Rate limit is expected at high concurrency; the client has
        // already set its cooldown, so the next iteration will block
        // on awaitRateLimit. No need to log noise for 429s.
        if (!isRateLimitError(err)) {
          console.warn('[followingCleanup] getFollows failed; retrying', err);
        }
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      let discovered = 0;
      for (const profile of page.follows) {
        if (this.state.entries[profile.did]) continue;
        const followedAt = this.orphanFollowedAt.get(profile.did) ?? null;
        if (followedAt !== null) this.orphanFollowedAt.delete(profile.did);
        this.state.entries[profile.did] = {
          profile,
          status: 'pending',
          lastActivityAt: null,
          followedAt,
        };
        this.queue.push(profile);
        // The graph.getFollows endpoint returns the lightweight profileView
        // which lacks follower / following / posts counts. Queue this DID
        // for the parallel getProfiles enrichment pass.
        if (!this.profilesEnriched.has(profile.did)) {
          this.profilesQueue.push(profile.did);
        }
        discovered += 1;
      }
      if (discovered > 0) {
        this.state = {
          ...this.state,
          totalDiscovered: this.state.totalDiscovered + discovered,
        };
      }
      this.cursor = page.cursor;
      if (!page.cursor) {
        this.state = { ...this.state, paginationDone: true };
        return;
      }
    }
  }

  /**
   * Parallel producer that pages through the user's `app.bsky.graph.follow`
   * records to recover each follow's `createdAt`. Records the date on the
   * matching entry if discovered; otherwise stashes it for the main
   * producer to pick up when it discovers the profile.
   */
  private async followRecordsProducer() {
    if (this.followRecordsDone || !this.creds) return;
    const { api, token } = this.creds;
    while (!this.pauseRequested) {
      let page;
      try {
        page = await api.listFollowRecords(
          token,
          this.accountDid,
          100,
          this.followRecordsCursor,
        );
      } catch (err) {
        if (!isRateLimitError(err)) {
          console.warn('[followingCleanup] listFollowRecords failed; retrying', err);
        }
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      for (const record of page.records) {
        const did = record.value?.subject;
        const followedAt = record.value?.createdAt;
        if (!did || !followedAt) continue;
        const entry = this.state.entries[did];
        if (entry) {
          if (entry.followedAt === null) entry.followedAt = followedAt;
        } else {
          this.orphanFollowedAt.set(did, followedAt);
        }
      }
      this.followRecordsCursor = page.cursor;
      if (!page.cursor) {
        this.followRecordsDone = true;
        return;
      }
    }
  }

  /**
   * Pulls DIDs off `profilesQueue` in batches and calls getProfiles to
   * backfill `followersCount`, `followsCount`, `postsCount`, etc. on the
   * existing entries. Runs concurrently with the author-feed workers.
   */
  private async profilesWorker() {
    if (!this.creds) return;
    const { api, token } = this.creds;
    while (!this.pauseRequested) {
      if (this.profilesQueue.length === 0) {
        // No more work? Wait for producer to discover more.
        if (this.state.paginationDone) return;
        await new Promise((r) => setTimeout(r, 50));
        continue;
      }
      const batch = this.profilesQueue.splice(0, PROFILES_BATCH_SIZE);
      let response;
      try {
        response = await api.getProfiles(token, batch);
      } catch (err) {
        if (!isRateLimitError(err)) {
          console.warn('[followingCleanup] getProfiles failed; retrying', err);
        }
        // On error, re-queue and back off. The client's pre-fetch
        // awaitRateLimit will block the next attempt until the
        // rate-limit window opens, so this is essentially free.
        this.profilesQueue.unshift(...batch);
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      for (const detailed of response.profiles) {
        if (!detailed?.did) continue;
        this.profilesEnriched.add(detailed.did);
        const entry = this.state.entries[detailed.did];
        if (!entry) continue;
        // Merge into the existing profile rather than replacing — we want
        // to keep the viewer.following URI that came from getFollows.
        entry.profile = {
          ...entry.profile,
          ...detailed,
          viewer: { ...entry.profile.viewer, ...detailed.viewer },
        };
      }
    }
  }

  private async worker() {
    if (!this.creds) return;
    const { api, token } = this.creds;
    while (!this.pauseRequested) {
      const profile = this.queue.shift();
      if (!profile) {
        if (this.state.paginationDone) return;
        await new Promise((r) => setTimeout(r, 50));
        continue;
      }

      const pendingEntry = this.state.entries[profile.did];
      if (pendingEntry) pendingEntry.status = 'scanning';

      try {
        // Limit=3 instead of 1 — sometimes the first item is a pinned post
        // with an old indexedAt, or the feed is one entry short of what
        // we expect for a still-active account. Three is cheap insurance.
        let feed = await api.getAuthorFeed(
          token,
          profile.did,
          3,
          undefined,
          'posts_with_replies',
        );
        // Treat an unexpectedly empty response as a soft failure and
        // retry once with no filter — some AppView paths return empty
        // for `posts_with_replies` on accounts that have only ever
        // reposted, even though the unfiltered default should include
        // reposts. The retry has a small backoff to dodge rate limits.
        if (feed.feed.length === 0) {
          await new Promise((r) => setTimeout(r, 250));
          feed = await api.getAuthorFeed(token, profile.did, 3);
        }
        const item: BlueskyFeedItem | undefined = feed.feed[0];
        const lastActivityAt = item?.reason?.indexedAt ?? item?.post?.indexedAt ?? null;
        const entry = this.state.entries[profile.did];
        if (entry) {
          entry.status = 'done';
          entry.lastActivityAt = lastActivityAt;
        }
        if (this.state.entries[profile.did]) {
          this.state = {
            ...this.state,
            totalScanned: this.state.totalScanned + 1,
          };
        }
      } catch (err) {
        // Rate limit: don't count as scanned and don't mark as error.
        // Requeue so the next pass (after the client's cooldown lifts)
        // picks the profile back up.
        if (isRateLimitError(err)) {
          const entry = this.state.entries[profile.did];
          if (entry) {
            entry.status = 'pending';
            this.queue.push(profile);
          }
          continue;
        }
        const entry = this.state.entries[profile.did];
        if (entry) entry.status = 'error';
        if (this.state.entries[profile.did]) {
          this.state = {
            ...this.state,
            totalScanned: this.state.totalScanned + 1,
          };
        }
      }
    }
  }
}

const controllers = new Map<string, FollowingCleanupController>();

export function getFollowingCleanupController(
  queryClient: QueryClient,
  accountDid: string,
): FollowingCleanupController {
  let ctrl = controllers.get(accountDid);
  if (!ctrl) {
    ctrl = new FollowingCleanupController(queryClient, accountDid);
    controllers.set(accountDid, ctrl);
  }
  return ctrl;
}

export { initialState as initialFollowingCleanupState };
