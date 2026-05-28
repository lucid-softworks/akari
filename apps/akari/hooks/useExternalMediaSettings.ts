import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

/**
 * Local preferences for rich third-party embeds. When a provider is
 * disabled, the corresponding embed component renders as a plain
 * link card instead of loading the upstream player. Stored in MMKV
 * so the toggle survives across reloads.
 */
const storage = new MMKV({ id: 'external-media-settings' });

type Provider = 'youtube' | 'gif';

const KEY: Record<Provider, string> = {
  youtube: 'youtube_embed_enabled',
  gif: 'gif_embed_enabled',
};

type ExternalMediaSnapshot = Record<Provider, boolean>;

let cached: ExternalMediaSnapshot | null = null;
const listeners = new Set<() => void>();

function read(): ExternalMediaSnapshot {
  return {
    youtube: storage.getBoolean(KEY.youtube) ?? true,
    gif: storage.getBoolean(KEY.gif) ?? true,
  };
}

function getSnapshot(): ExternalMediaSnapshot {
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

export function useExternalMediaSettings() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setProvider = useCallback((provider: Provider, enabled: boolean) => {
    storage.set(KEY[provider], enabled);
    notify();
  }, []);

  return {
    youtubeEnabled: value.youtube,
    gifEnabled: value.gif,
    setYoutubeEnabled: (v: boolean) => setProvider('youtube', v),
    setGifEnabled: (v: boolean) => setProvider('gif', v),
  };
}
