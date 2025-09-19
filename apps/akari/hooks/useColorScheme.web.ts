import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

type Scheme = 'light' | 'dark';

const DEFAULT_SCHEME: Scheme = 'light';

/**
 * Web implementation of the color scheme hook.
 *
 * React Native Web's `useColorScheme` hook doesn't broadcast updates when the
 * system appearance changes after hydration. We subscribe to the browser
 * `matchMedia` API so all themed components respond to system toggles in real
 * time.
 */
export function useColorScheme(): Scheme {
  const supportsMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const nativeScheme = useRNColorScheme();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [browserScheme, setBrowserScheme] = useState<Scheme | null>(() => {
    if (!supportsMatchMedia) {
      return null;
    }

    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return null;
    }
  });

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!supportsMatchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateScheme = (target: Pick<MediaQueryList, 'matches'>) => {
      setBrowserScheme((previous) => {
        const nextScheme: Scheme = target.matches ? 'dark' : 'light';
        return previous === nextScheme ? previous : nextScheme;
      });
    };

    updateScheme(mediaQuery);

    const listener = (event: MediaQueryListEvent) => updateScheme(event);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, [supportsMatchMedia]);

  useEffect(() => {
    if (!nativeScheme || browserScheme || supportsMatchMedia) {
      return;
    }

    setBrowserScheme(nativeScheme);
  }, [browserScheme, nativeScheme, supportsMatchMedia]);

  if (!hasHydrated) {
    return DEFAULT_SCHEME;
  }

  if (browserScheme) {
    return browserScheme;
  }

  if (nativeScheme === 'dark') {
    return 'dark';
  }

  return DEFAULT_SCHEME;
}
