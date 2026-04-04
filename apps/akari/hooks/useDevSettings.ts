import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const FPS_OVERLAY_KEY = 'dev_fps_overlay';

let cachedValue: boolean | null = null;
let listeners = new Set<() => void>();

function read(): boolean {
  try {
    return storage.getBoolean(FPS_OVERLAY_KEY) ?? true;
  } catch {
    return true;
  }
}

function getSnapshot(): boolean {
  if (cachedValue === null) {
    cachedValue = read();
  }
  return cachedValue;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notify() {
  cachedValue = read();
  for (const l of listeners) l();
}

export function useDevSettings() {
  const fpsOverlayEnabled = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setFpsOverlayEnabled = useCallback((enabled: boolean) => {
    storage.set(FPS_OVERLAY_KEY, enabled);
    notify();
  }, []);

  return { fpsOverlayEnabled, setFpsOverlayEnabled };
}
