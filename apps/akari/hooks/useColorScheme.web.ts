import { useSyncExternalStore } from 'react';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(DARK_QUERY);
  mql.addEventListener('change', onStoreChange);
  return () => mql.removeEventListener('change', onStoreChange);
}

function getSnapshot(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function getServerSnapshot(): 'light' {
  return 'light';
}

/**
 * To support static rendering, the server snapshot is always 'light' and the
 * client snapshot is read from `matchMedia`. `useSyncExternalStore` handles
 * the subscribe / unsubscribe lifecycle around the media-query change event,
 * which avoids the mount-time setState flash the old `useEffect` gate had.
 */
export function useColorScheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
