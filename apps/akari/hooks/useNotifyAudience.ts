import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

/**
 * Local "who can notify you" preference. atproto's notification
 * declaration record allows per-type audiences (replies vs mentions vs
 * quotes etc.); we store the user's single global default here for now
 * and ship it up to the notifier when the per-type UI lands.
 */
export type NotifyAudience = 'anyone' | 'followers' | 'mutuals' | 'no-one';

const storage = new MMKV({ id: 'notify-audience' });
const KEY = 'audience';

const VALID: readonly NotifyAudience[] = ['anyone', 'followers', 'mutuals', 'no-one'];

let cached: NotifyAudience | null = null;
const listeners = new Set<() => void>();

function read(): NotifyAudience {
  const raw = storage.getString(KEY);
  return VALID.find((v) => v === raw) ?? 'followers';
}

function getSnapshot(): NotifyAudience {
  if (cached === null) cached = read();
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  cached = read();
  for (const l of listeners) l();
}

export function useNotifyAudience() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setAudience = useCallback((next: NotifyAudience) => {
    storage.set(KEY, next);
    notify();
  }, []);
  return { audience: value, setAudience };
}
