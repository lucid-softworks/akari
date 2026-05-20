import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

/**
 * User preference for which logo variant the app should display in-app
 * and as the web favicon. Stored locally via MMKV so the choice is
 * available before any network fetch.
 *
 * Two variants are shipped today:
 *   - 'default' — the current akari mark (icon.png)
 *   - 'classic' — the original akari mark (logo-classic.png)
 *
 * The homescreen app icon is also driven by this setting on native via
 * a separate `setAlternateAppIcon` call wired in App boot.
 */
export type LogoVariant = 'default' | 'classic';

const storage = new MMKV({ id: 'logo-settings' });
const LOGO_KEY = 'variant';

let cached: LogoVariant | null = null;
const listeners = new Set<() => void>();

function read(): LogoVariant {
  try {
    const v = storage.getString(LOGO_KEY);
    return v === 'classic' ? 'classic' : 'default';
  } catch {
    return 'default';
  }
}

function getSnapshot(): LogoVariant {
  if (cached === null) cached = read();
  return cached;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  cached = read();
  for (const listener of listeners) listener();
}

export function useLogoVariant(): LogoVariant {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSetLogoVariant() {
  return useCallback((variant: LogoVariant) => {
    try {
      storage.set(LOGO_KEY, variant);
    } catch {
      // best-effort; if persistence fails, in-memory cache + UI still updates
    }
    emit();
  }, []);
}

/**
 * Synchronous reader used by non-React boot paths (e.g. the web
 * favicon updater). Don't call from a render function — use
 * `useLogoVariant` there so the component re-renders on change.
 */
export function readLogoVariant(): LogoVariant {
  return read();
}
