import { useSyncExternalStore, useCallback } from 'react';
import { MMKV } from 'react-native-mmkv';

import type { Colors } from '@/constants/Colors';

const storage = new MMKV();
const STORAGE_KEY = 'theme_config';

type ColorKeys = keyof typeof Colors.light & keyof typeof Colors.dark;

export type ColorMode = 'light' | 'dark' | 'auto';

export type ThemeColorOverrides = {
  light?: Partial<Record<ColorKeys, string>>;
  dark?: Partial<Record<ColorKeys, string>>;
  accentColor?: string;
  colorMode?: ColorMode;
};

const DEFAULT_CONFIG: ThemeColorOverrides = {};

let cachedConfig: ThemeColorOverrides | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): ThemeColorOverrides {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return JSON.parse(raw) as ThemeColorOverrides;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function getSnapshot(): ThemeColorOverrides {
  if (cachedConfig === null) {
    cachedConfig = readFromStorage();
  }
  return cachedConfig;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notify() {
  cachedConfig = readFromStorage();
  for (const l of listeners) l();
}

function save(config: ThemeColorOverrides) {
  storage.set(STORAGE_KEY, JSON.stringify(config));
  notify();
}

// Exported store for useThemeColor to subscribe to directly
export const themeConfigStore = { subscribe, getSnapshot };

export function useThemeConfig() {
  const config = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setAccentColor = useCallback((color: string | null) => {
    const current = getSnapshot();
    if (color) {
      save({ ...current, accentColor: color });
    } else {
      const { accentColor: _, ...rest } = current;
      save(rest);
    }
  }, []);

  const setModeColor = useCallback((mode: 'light' | 'dark', key: ColorKeys, color: string | null) => {
    const current = getSnapshot();
    const modeColors = { ...current[mode] };
    if (color) {
      modeColors[key] = color;
    } else {
      delete modeColors[key];
    }
    save({ ...current, [mode]: Object.keys(modeColors).length > 0 ? modeColors : undefined });
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    const current = getSnapshot();
    save({ ...current, colorMode: mode === 'auto' ? undefined : mode });
  }, []);

  const resetToDefaults = useCallback(() => {
    storage.delete(STORAGE_KEY);
    notify();
  }, []);

  return { config, setAccentColor, setModeColor, setColorMode, resetToDefaults };
}
