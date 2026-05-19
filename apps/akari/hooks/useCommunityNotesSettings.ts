import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

/**
 * Per-device Community Notes contributor settings. Matches X's
 * "Enroll in Community Notes" gate: only contributors get the
 * "Add Community Note" menu item and the contributor portal pages.
 * Reader-side affordances (the inline note panel, "Request a note"
 * menu item) are visible to everyone.
 */
const storage = new MMKV({ id: 'community-notes-settings' });
const CONTRIBUTOR_KEY = 'contributor_opt_in';

let cached: { isContributor: boolean } | null = null;
const listeners = new Set<() => void>();

function read(): { isContributor: boolean } {
  try {
    const raw = storage.getBoolean(CONTRIBUTOR_KEY);
    return { isContributor: typeof raw === 'boolean' ? raw : false };
  } catch {
    return { isContributor: false };
  }
}

function getSnapshot() {
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

export function useCommunityNotesSettings() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setIsContributor = useCallback((next: boolean) => {
    storage.set(CONTRIBUTOR_KEY, next);
    notify();
  }, []);
  return { isContributor: value.isContributor, setIsContributor };
}

/** Read-only accessor for hooks that don't need the setter. */
export function useIsCommunityNotesContributor(): boolean {
  return useCommunityNotesSettings().isContributor;
}
