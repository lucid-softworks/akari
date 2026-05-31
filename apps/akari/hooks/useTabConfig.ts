import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const STORAGE_KEY = 'tab_config';

export type TabKey =
  | 'index'
  | 'search'
  | 'messages'
  | 'notifications'
  | 'bookmarks'
  | 'profile'
  | 'community-notes'
  | 'moderation'
  | 'settings';

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
  { key: 'community-notes', label: 'Community Notes', icon: 'info.circle.fill' },
  { key: 'moderation', label: 'Moderation', icon: 'shield.fill' },
  { key: 'settings', label: 'Settings', icon: 'gearshape.fill', alwaysVisible: true },
];

const DEFAULT_VISIBLE: TabKey[] = [
  'index',
  'search',
  'notifications',
  'messages',
  'bookmarks',
  'profile',
  'community-notes',
  'settings',
];
const DEFAULT_CONFIG: TabConfig = { visibleTabs: DEFAULT_VISIBLE };

/**
 * Tabs that don't apply to Mastodon accounts and should be filtered from
 * the rendered sidebar / bottom-bar. Persistence keeps them in
 * `visibleTabs` (so toggling back to an atproto account restores them);
 * filtering is purely display-side. Extend this list when you add a new
 * atproto-specific tab.
 *
 * `messages` is hidden because Akari's atproto chat surface is wired to
 * `chat.bsky.convo.*` (Bluesky-specific). Mastodon's DM equivalent is
 * status-based and not yet implemented; until a Mastodon-aware messages
 * surface lands, the tab would just crash on open for Mastodon accounts.
 */
export const MASTODON_HIDDEN_TABS: ReadonlySet<TabKey> = new Set(['community-notes', 'messages']);

/**
 * Apply provider-specific filtering on top of the user's persisted tab
 * selection. Returns a new array; safe to call inside `useMemo`.
 */
export function filterTabsForProvider(
  tabs: readonly TabKey[],
  provider: 'atproto' | 'mastodon' | undefined,
): TabKey[] {
  if (provider !== 'mastodon') return [...tabs];
  return tabs.filter((tab) => !MASTODON_HIDDEN_TABS.has(tab));
}

// Cached snapshot -- useSyncExternalStore compares by reference,
// so we must return the same object when nothing changed.
let cachedConfig: TabConfig | null = null;
let listeners = new Set<() => void>();

function readFromStorage(): TabConfig {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
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
  if (cachedConfig === null) {
    cachedConfig = readFromStorage();
  }
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
