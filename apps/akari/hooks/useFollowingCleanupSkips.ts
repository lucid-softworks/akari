import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

/**
 * Per-account "don't ever surface this follow in cleanup results" list.
 * Lives in MMKV (so it survives app restarts) and is keyed by the
 * viewer's DID, so two accounts on the same device don't share skips.
 *
 * No corresponding atproto primitive — the user explicitly wants a
 * private, local-only "keep" list. Hiding via app.bsky.graph.muteActor
 * or list-block would be visible to others and is the wrong semantic.
 */
const storage = new MMKV({ id: 'following-cleanup-skips' });

const keyFor = (accountDid: string) => `skips:${accountDid}`;

function readSet(accountDid: string): Set<string> {
  try {
    const raw = storage.getString(keyFor(accountDid));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((s): s is string => typeof s === 'string'));
  } catch {
    return new Set();
  }
}

function writeSet(accountDid: string, set: Set<string>) {
  storage.set(keyFor(accountDid), JSON.stringify(Array.from(set)));
}

const caches = new Map<string, ReadonlySet<string>>();
const listeners = new Map<string, Set<() => void>>();

function getSnapshot(accountDid: string): ReadonlySet<string> {
  let snap = caches.get(accountDid);
  if (snap === undefined) {
    snap = readSet(accountDid);
    caches.set(accountDid, snap);
  }
  return snap;
}

function subscribe(accountDid: string, listener: () => void) {
  let set = listeners.get(accountDid);
  if (!set) {
    set = new Set();
    listeners.set(accountDid, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
  };
}

function notify(accountDid: string) {
  caches.set(accountDid, readSet(accountDid));
  const set = listeners.get(accountDid);
  if (!set) return;
  for (const l of set) l();
}

/**
 * Reactive accessor for the skip list belonging to `accountDid`. Returns
 * an empty set when `accountDid` is undefined so the hook is safe to
 * call before sign-in resolves.
 */
export function useFollowingCleanupSkips(accountDid: string | undefined) {
  const skipped = useSyncExternalStore(
    (l) => (accountDid ? subscribe(accountDid, l) : () => {}),
    () => (accountDid ? getSnapshot(accountDid) : EMPTY),
    () => (accountDid ? getSnapshot(accountDid) : EMPTY),
  );

  const skip = useCallback(
    (did: string) => {
      if (!accountDid) return;
      const next = new Set(readSet(accountDid));
      if (next.has(did)) return;
      next.add(did);
      writeSet(accountDid, next);
      notify(accountDid);
    },
    [accountDid],
  );

  const unskip = useCallback(
    (did: string) => {
      if (!accountDid) return;
      const next = new Set(readSet(accountDid));
      if (next.delete(did)) {
        writeSet(accountDid, next);
        notify(accountDid);
      }
    },
    [accountDid],
  );

  const clearAll = useCallback(() => {
    if (!accountDid) return;
    writeSet(accountDid, new Set());
    notify(accountDid);
  }, [accountDid]);

  return { skipped, skip, unskip, clearAll };
}

const EMPTY: ReadonlySet<string> = new Set();
