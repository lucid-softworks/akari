import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'accessibility-settings' });
const REQUIRE_ALT_TEXT_KEY = 'require_alt_text';
const LARGER_TEXT_BADGES_KEY = 'larger_text_badges';
const LARGER_ALT_TEXT_BADGES_KEY = 'larger_alt_text_badges';

type AccessibilitySnapshot = {
  /** Block sending an image post without alt text. */
  requireAltText: boolean;
  /** Render engagement counts in a larger, more legible text size. */
  largerTextBadges: boolean;
  /** Make the "ALT" indicator on images with descriptions more prominent. */
  largerAltTextBadges: boolean;
};

let cached: AccessibilitySnapshot | null = null;
const listeners = new Set<() => void>();

function readBool(key: string, fallback: boolean): boolean {
  try {
    return storage.getBoolean(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function readAll(): AccessibilitySnapshot {
  return {
    requireAltText: readBool(REQUIRE_ALT_TEXT_KEY, false),
    largerTextBadges: readBool(LARGER_TEXT_BADGES_KEY, false),
    largerAltTextBadges: readBool(LARGER_ALT_TEXT_BADGES_KEY, false),
  };
}

function getSnapshot(): AccessibilitySnapshot {
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

export function useAccessibilitySettings() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setRequireAltText = useCallback((enabled: boolean) => {
    storage.set(REQUIRE_ALT_TEXT_KEY, enabled);
    notify();
  }, []);

  const setLargerTextBadges = useCallback((enabled: boolean) => {
    storage.set(LARGER_TEXT_BADGES_KEY, enabled);
    notify();
  }, []);

  const setLargerAltTextBadges = useCallback((enabled: boolean) => {
    storage.set(LARGER_ALT_TEXT_BADGES_KEY, enabled);
    notify();
  }, []);

  return {
    requireAltText: value.requireAltText,
    setRequireAltText,
    largerTextBadges: value.largerTextBadges,
    setLargerTextBadges,
    largerAltTextBadges: value.largerAltTextBadges,
    setLargerAltTextBadges,
  };
}
