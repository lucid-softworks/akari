import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'moderation-settings' });
const ADULT_CONTENT_KEY = 'adult_content_enabled';

type ModerationSnapshot = {
  /**
   * Show content labelled as adult. Stored locally for now; eventually this
   * should round-trip to Bluesky's `app.bsky.actor.preferences#adultContentPref`
   * via `getPreferences` / `putPreferences` so it follows the user across
   * clients.
   */
  adultContentEnabled: boolean;
};

let cached: ModerationSnapshot | null = null;
const listeners = new Set<() => void>();

function readBool(key: string, fallback: boolean): boolean {
  try {
    return storage.getBoolean(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function readAll(): ModerationSnapshot {
  return {
    adultContentEnabled: readBool(ADULT_CONTENT_KEY, false),
  };
}

function getSnapshot(): ModerationSnapshot {
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

export function useModerationSettings() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setAdultContentEnabled = useCallback((enabled: boolean) => {
    storage.set(ADULT_CONTENT_KEY, enabled);
    notify();
  }, []);

  return {
    adultContentEnabled: value.adultContentEnabled,
    setAdultContentEnabled,
  };
}
