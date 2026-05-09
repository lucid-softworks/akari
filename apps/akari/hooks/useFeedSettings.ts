import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

/**
 * Local user preferences for the feed tab. Lives in its own MMKV
 * instance so unrelated settings (dev-tools, drafts, etc.) don't
 * share keys.
 */
const storage = new MMKV({ id: 'feed-settings' });
const TRENDING_BAR_KEY = 'trending_bar_enabled';
const TRENDING_VIDEOS_KEY = 'trending_videos_enabled';
const VIDEO_AUTOPLAY_KEY = 'video_autoplay_enabled';

type FeedSettingsSnapshot = {
  trendingBarEnabled: boolean;
  trendingVideosEnabled: boolean;
  videoAutoplayEnabled: boolean;
};

let cached: FeedSettingsSnapshot | null = null;
const listeners = new Set<() => void>();

function readBool(key: string, fallback: boolean): boolean {
  try {
    return storage.getBoolean(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function readAll(): FeedSettingsSnapshot {
  return {
    trendingBarEnabled: readBool(TRENDING_BAR_KEY, true),
    trendingVideosEnabled: readBool(TRENDING_VIDEOS_KEY, true),
    videoAutoplayEnabled: readBool(VIDEO_AUTOPLAY_KEY, true),
  };
}

function getSnapshot(): FeedSettingsSnapshot {
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

export function useFeedSettings() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setTrendingBarEnabled = useCallback((enabled: boolean) => {
    storage.set(TRENDING_BAR_KEY, enabled);
    notify();
  }, []);

  const setTrendingVideosEnabled = useCallback((enabled: boolean) => {
    storage.set(TRENDING_VIDEOS_KEY, enabled);
    notify();
  }, []);

  const setVideoAutoplayEnabled = useCallback((enabled: boolean) => {
    storage.set(VIDEO_AUTOPLAY_KEY, enabled);
    notify();
  }, []);

  return {
    trendingBarEnabled: value.trendingBarEnabled,
    setTrendingBarEnabled,
    trendingVideosEnabled: value.trendingVideosEnabled,
    setTrendingVideosEnabled,
    videoAutoplayEnabled: value.videoAutoplayEnabled,
    setVideoAutoplayEnabled,
  };
}
