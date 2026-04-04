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
  { key: 'profile', label: 'Profile', icon: 'person.fill', alwaysVisible: true },
  { key: 'settings', label: 'Settings', icon: 'gearshape.fill' },
];

const DEFAULT_VISIBLE: TabKey[] = ['index', 'search', 'notifications', 'bookmarks', 'profile', 'settings'];

let listeners = new Set<() => void>();

function getSnapshot(): TabConfig {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) return { visibleTabs: DEFAULT_VISIBLE };
  try {
    const parsed = JSON.parse(raw) as TabConfig;
    // Ensure profile is always included
    if (!parsed.visibleTabs.includes('profile')) {
      parsed.visibleTabs.push('profile');
    }
    return parsed;
  } catch {
    return { visibleTabs: DEFAULT_VISIBLE };
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function useTabConfig() {
  const config = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setVisibleTabs = useCallback((tabs: readonly TabKey[]) => {
    // Ensure profile is always included
    const withProfile: TabKey[] = tabs.includes('profile') ? [...tabs] : [...tabs, 'profile'];
    const newConfig: TabConfig = { visibleTabs: withProfile };
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
