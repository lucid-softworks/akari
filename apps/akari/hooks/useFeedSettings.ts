import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

/**
 * Local user preferences for the feed tab. Currently just the
 * trending-bar toggle, but lives in its own MMKV instance so unrelated
 * settings (dev-tools, etc.) don't share keys.
 */
const storage = new MMKV({ id: 'feed-settings' });
const TRENDING_BAR_KEY = 'trending_bar_enabled';

let cached: boolean | null = null;
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return storage.getBoolean(TRENDING_BAR_KEY) ?? true;
  } catch {
    return true;
  }
}

function getSnapshot(): boolean {
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

export function useFeedSettings() {
  const trendingBarEnabled = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setTrendingBarEnabled = useCallback((enabled: boolean) => {
    storage.set(TRENDING_BAR_KEY, enabled);
    notify();
  }, []);
  return { trendingBarEnabled, setTrendingBarEnabled };
}
