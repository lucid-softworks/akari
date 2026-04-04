import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const STORAGE_KEY = 'tab_config';

export type TabKey = 'index' | 'search' | 'messages' | 'notifications' | 'bookmarks' | 'profile' | 'settings';

export type TabConfig = {
  /** Ordered list of visible tab keys */
  visibleTabs: TabKey[];
};

/** All available tabs with metadata */
export const ALL_TABS: { key: TabKey; label: string; icon: string; alwaysVisible?: boolean }[] = [
  { key: 'index', label: 'Home', icon: 'house.fill' },
  { key: 'search', label: 'Search', icon: 'magnifyingglass' },
  { key: 'messages', label: 'Messages', icon: 'message.fill' },
  { key: 'notifications', label: 'Notifications', icon: 'bell.fill' },
  { key: 'bookmarks', label: 'Bookmarks', icon: 'bookmark.fill' },
  { key: 'profile', label: 'Profile', icon: 'person.fill' },
  { key: 'settings', label: 'Settings', icon: 'gearshape.fill', alwaysVisible: true },
];

const DEFAULT_VISIBLE: TabKey[] = ['index', 'search', 'notifications', 'bookmarks', 'profile', 'settings'];
const DEFAULT_CONFIG: TabConfig = { visibleTabs: DEFAULT_VISIBLE };

// Cached snapshot -- useSyncExternalStore compares by reference,
// so we must return the same object when nothing changed.
let cachedConfig: TabConfig = readFromStorage();
let listeners = new Set<() => void>();

function readFromStorage(): TabConfig {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(raw) as TabConfig;
    if (!parsed.visibleTabs.includes('settings')) {
      parsed.visibleTabs.push('settings');
    }
    return parsed;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function getSnapshot(): TabConfig {
  return cachedConfig;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  cachedConfig = readFromStorage();
  for (const listener of listeners) {
    listener();
  }
}

export function useTabConfig() {
  const config = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setVisibleTabs = useCallback((tabs: readonly TabKey[]) => {
    const withSettings: TabKey[] = tabs.includes('settings') ? [...tabs] : [...tabs, 'settings'];
    const newConfig: TabConfig = { visibleTabs: withSettings };
    storage.set(STORAGE_KEY, JSON.stringify(newConfig));
    notify();
  }, []);

  const resetToDefault = useCallback(() => {
    storage.delete(STORAGE_KEY);
    notify();
  }, []);

  return {
    visibleTabs: config.visibleTabs,
    setVisibleTabs,
    resetToDefault,
  };
}
