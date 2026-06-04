import { useSyncExternalStore } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { themeConfigStore } from '@/hooks/useThemeConfig';

// RN 0.85 widened ColorSchemeName to `'light' | 'dark' | 'unspecified' | null
// | undefined`. Downstream theme dictionaries are only keyed by 'light' / 'dark',
// so narrow at the hook boundary rather than at every consumer.
export type ResolvedColorScheme = 'light' | 'dark';

export function useColorScheme(): ResolvedColorScheme {
  const systemScheme = useSystemColorScheme();
  const config = useSyncExternalStore(
    themeConfigStore.subscribe,
    themeConfigStore.getSnapshot,
    themeConfigStore.getSnapshot,
  );

  if (config.colorMode === 'light' || config.colorMode === 'dark') {
    return config.colorMode;
  }

  return systemScheme === 'dark' ? 'dark' : 'light';
}
