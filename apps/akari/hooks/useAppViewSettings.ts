import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

import {
  type AppViewConfig,
  type AppViewPresetId,
  type CdnPresetId,
  DEFAULT_APP_VIEW,
} from '@/utils/appView';

const storage = new MMKV({ id: 'appview-settings' });
const PRESET_KEY = 'preset';
const CUSTOM_URL_KEY = 'custom_url';
const CUSTOM_DID_KEY = 'custom_did';
const CDN_PRESET_KEY = 'cdn_preset';
const CUSTOM_CDN_URL_KEY = 'custom_cdn_url';

const VALID_PRESETS = new Set<AppViewPresetId>(['bsky', 'blacksky', 'custom']);
const VALID_CDN_PRESETS = new Set<CdnPresetId>(['bsky', 'blueat', 'custom']);

let cached: AppViewConfig | null = null;
const listeners = new Set<() => void>();

function readPreset(): AppViewPresetId {
  try {
    const raw = storage.getString(PRESET_KEY);
    if (raw && VALID_PRESETS.has(raw as AppViewPresetId)) {
      return raw as AppViewPresetId;
    }
  } catch {}
  return DEFAULT_APP_VIEW.preset;
}

function readCdnPreset(): CdnPresetId {
  try {
    const raw = storage.getString(CDN_PRESET_KEY);
    if (raw && VALID_CDN_PRESETS.has(raw as CdnPresetId)) {
      return raw as CdnPresetId;
    }
  } catch {}
  return DEFAULT_APP_VIEW.cdnPreset;
}

function readString(key: string): string | undefined {
  try {
    return storage.getString(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function readAll(): AppViewConfig {
  return {
    preset: readPreset(),
    customUrl: readString(CUSTOM_URL_KEY),
    customDid: readString(CUSTOM_DID_KEY),
    cdnPreset: readCdnPreset(),
    customCdnUrl: readString(CUSTOM_CDN_URL_KEY),
  };
}

function getSnapshot(): AppViewConfig {
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

/**
 * Synchronous read for non-hook code paths. Used by the BlueskyApi helpers
 * that build a client per query (`apiForAccount`, `apiForPdsUrl`).
 */
export function readAppViewSettings(): AppViewConfig {
  return getSnapshot();
}

/**
 * App-wide AppView preference. The settings screen at
 * `(tabs)/settings/appview.tsx` is the only place that mutates this; per-account
 * overrides live on the `Account` itself.
 */
export function useAppViewSettings() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setPreset = useCallback((preset: AppViewPresetId) => {
    storage.set(PRESET_KEY, preset);
    notify();
  }, []);

  const setCustomUrl = useCallback((url: string | undefined) => {
    if (url === undefined || url.length === 0) {
      storage.delete(CUSTOM_URL_KEY);
    } else {
      storage.set(CUSTOM_URL_KEY, url);
    }
    notify();
  }, []);

  const setCustomDid = useCallback((did: string | undefined) => {
    if (did === undefined || did.length === 0) {
      storage.delete(CUSTOM_DID_KEY);
    } else {
      storage.set(CUSTOM_DID_KEY, did);
    }
    notify();
  }, []);

  const setCdnPreset = useCallback((preset: CdnPresetId) => {
    storage.set(CDN_PRESET_KEY, preset);
    notify();
  }, []);

  const setCustomCdnUrl = useCallback((url: string | undefined) => {
    if (url === undefined || url.length === 0) {
      storage.delete(CUSTOM_CDN_URL_KEY);
    } else {
      storage.set(CUSTOM_CDN_URL_KEY, url);
    }
    notify();
  }, []);

  const reset = useCallback(() => {
    storage.delete(PRESET_KEY);
    storage.delete(CUSTOM_URL_KEY);
    storage.delete(CUSTOM_DID_KEY);
    storage.delete(CDN_PRESET_KEY);
    storage.delete(CUSTOM_CDN_URL_KEY);
    notify();
  }, []);

  return {
    config: value,
    setPreset,
    setCustomUrl,
    setCustomDid,
    setCdnPreset,
    setCustomCdnUrl,
    reset,
  };
}
