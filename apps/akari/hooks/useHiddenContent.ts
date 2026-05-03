import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

/**
 * Local-only hide list. Posts and accounts the user has hidden never
 * leave the device — atproto has no global "hide" primitive (block /
 * mute exist but are heavier and visible to the other side), so we
 * persist these via MMKV and let `PostCard` filter at render time.
 */
const storage = new MMKV({ id: 'hidden-content' });
const HIDDEN_POSTS_KEY = 'hidden_post_uris';
const HIDDEN_ACCOUNTS_KEY = 'hidden_account_dids';

type HiddenSets = {
  posts: ReadonlySet<string>;
  accounts: ReadonlySet<string>;
};

let cached: HiddenSets | null = null;
const listeners = new Set<() => void>();

function readSet(key: string): Set<string> {
  try {
    const raw = storage.getString(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((s): s is string => typeof s === 'string'));
  } catch {
    return new Set();
  }
}

function readAll(): HiddenSets {
  return {
    posts: readSet(HIDDEN_POSTS_KEY),
    accounts: readSet(HIDDEN_ACCOUNTS_KEY),
  };
}

function getSnapshot(): HiddenSets {
  if (cached === null) cached = readAll();
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  cached = readAll();
  for (const l of listeners) l();
}

function writeSet(key: string, set: Set<string>) {
  storage.set(key, JSON.stringify(Array.from(set)));
}

export function useHiddenContent() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const hidePost = useCallback((uri: string) => {
    const next = new Set(readSet(HIDDEN_POSTS_KEY));
    next.add(uri);
    writeSet(HIDDEN_POSTS_KEY, next);
    notify();
  }, []);

  const unhidePost = useCallback((uri: string) => {
    const next = new Set(readSet(HIDDEN_POSTS_KEY));
    if (next.delete(uri)) {
      writeSet(HIDDEN_POSTS_KEY, next);
      notify();
    }
  }, []);

  const hideAccount = useCallback((did: string) => {
    const next = new Set(readSet(HIDDEN_ACCOUNTS_KEY));
    next.add(did);
    writeSet(HIDDEN_ACCOUNTS_KEY, next);
    notify();
  }, []);

  const unhideAccount = useCallback((did: string) => {
    const next = new Set(readSet(HIDDEN_ACCOUNTS_KEY));
    if (next.delete(did)) {
      writeSet(HIDDEN_ACCOUNTS_KEY, next);
      notify();
    }
  }, []);

  const isHidden = useCallback(
    (postUri: string | undefined, authorDid: string | undefined) => {
      if (postUri && value.posts.has(postUri)) return true;
      if (authorDid && value.accounts.has(authorDid)) return true;
      return false;
    },
    [value],
  );

  return {
    hiddenPosts: value.posts,
    hiddenAccounts: value.accounts,
    isHidden,
    hidePost,
    unhidePost,
    hideAccount,
    unhideAccount,
  };
}
