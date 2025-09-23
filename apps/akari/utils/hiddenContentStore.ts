import { useSyncExternalStore } from 'react';

type HiddenContentSnapshot = {
  posts: Set<string>;
  accounts: Set<string>;
};

const hiddenPosts = new Set<string>();
const hiddenAccounts = new Set<string>();
const listeners = new Set<() => void>();

const emitChange = () => {
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): HiddenContentSnapshot => ({
  posts: new Set(hiddenPosts),
  accounts: new Set(hiddenAccounts),
});

const getServerSnapshot = (): HiddenContentSnapshot => ({ posts: new Set(), accounts: new Set() });

export function useHiddenContent(): HiddenContentSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function hidePost(postUri: string | null | undefined) {
  if (!postUri || hiddenPosts.has(postUri)) {
    return;
  }

  hiddenPosts.add(postUri);
  emitChange();
}

export function hideAccount(identifier: string | null | undefined) {
  if (!identifier || hiddenAccounts.has(identifier)) {
    return;
  }

  hiddenAccounts.add(identifier);
  emitChange();
}

export function resetHiddenContent() {
  if (hiddenPosts.size === 0 && hiddenAccounts.size === 0) {
    return;
  }

  hiddenPosts.clear();
  hiddenAccounts.clear();
  emitChange();
}
