import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'messages-settings' });
const HIDE_DELETED_ACCOUNTS_KEY = 'hide_deleted_accounts';

type MessagesSnapshot = {
  /**
   * Hide conversations whose only/primary other participant resolves to a
   * deleted account (handle === 'missing.invalid'). The conversation row
   * normally renders as "Deleted Account" — this filters those rows from
   * the inbox entirely so they don't take up space.
   */
  hideDeletedAccounts: boolean;
};

let cached: MessagesSnapshot | null = null;
const listeners = new Set<() => void>();

function readBool(key: string, fallback: boolean): boolean {
  try {
    return storage.getBoolean(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function readAll(): MessagesSnapshot {
  return {
    hideDeletedAccounts: readBool(HIDE_DELETED_ACCOUNTS_KEY, false),
  };
}

function getSnapshot(): MessagesSnapshot {
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

export function useMessagesSettings() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setHideDeletedAccounts = useCallback((enabled: boolean) => {
    storage.set(HIDE_DELETED_ACCOUNTS_KEY, enabled);
    notify();
  }, []);

  return {
    hideDeletedAccounts: value.hideDeletedAccounts,
    setHideDeletedAccounts,
  };
}
