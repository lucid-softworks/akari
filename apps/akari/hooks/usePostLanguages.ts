import { useCallback, useSyncExternalStore } from 'react';
import { MMKV } from 'react-native-mmkv';

import { useLanguage } from '@/contexts/LanguageContext';

const storage = new MMKV({ id: 'post-languages' });
const STORAGE_KEY = 'last_post_langs_v1';

/** Strip a regional subtag — `'en-US'` -> `'en'` — when the picker doesn't
 *  carry that tag. The post lexicon accepts either, but we normalise on
 *  short forms to match the rest of the BCP-47 picker. */
function normalizeLocale(locale: string): string {
  return locale.replace(/_/g, '-').split('-')[0] ?? 'en';
}

function read(): string[] | null {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return null;
  }
}

let cached: string[] | null | undefined;
const listeners = new Set<() => void>();

function getSnapshot(): string[] | null {
  if (cached === undefined) cached = read();
  return cached;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function write(next: string[]): void {
  storage.set(STORAGE_KEY, JSON.stringify(next));
  cached = next;
  for (const fn of listeners) fn();
}

/**
 * Persistent "what languages did you post in last time" — used as the
 * default selection in the post composer. Falls back to the user's current
 * UI locale on first use.
 */
export function usePostLanguages() {
  const { currentLocale } = useLanguage();
  const stored = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const langs = stored && stored.length > 0 ? stored : [normalizeLocale(currentLocale)];

  const setLangs = useCallback((next: string[]) => {
    write(next);
  }, []);

  return { langs, setLangs };
}
