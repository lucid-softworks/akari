import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

import { DEFAULT_OZONE_DID } from '@/utils/blueskyOzone';

/**
 * Per-device Ozone settings. Currently just the labeler DID — defaults
 * to the official Bluesky moderation service but can be pointed at a
 * self-hosted instance from the moderation settings screen.
 */
const storage = new MMKV({ id: 'ozone-settings' });
const DID_KEY = 'ozone_did';

let cached: { ozoneDid: string } | null = null;
const listeners = new Set<() => void>();

function read(): { ozoneDid: string } {
  try {
    const raw = storage.getString(DID_KEY);
    return { ozoneDid: raw && raw.trim().length > 0 ? raw : DEFAULT_OZONE_DID };
  } catch {
    return { ozoneDid: DEFAULT_OZONE_DID };
  }
}

function getSnapshot() {
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

export function useOzoneSettings() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setOzoneDid = useCallback((did: string) => {
    const trimmed = did.trim();
    if (trimmed.length === 0 || trimmed === DEFAULT_OZONE_DID) {
      storage.delete(DID_KEY);
    } else {
      storage.set(DID_KEY, trimmed);
    }
    notify();
  }, []);
  const resetOzoneDid = useCallback(() => {
    storage.delete(DID_KEY);
    notify();
  }, []);
  return { ozoneDid: value.ozoneDid, setOzoneDid, resetOzoneDid };
}

/** Convenience read-only accessor for hooks that don't need the setter. */
export function useOzoneDid(): string {
  return useOzoneSettings().ozoneDid;
}
