import { useSyncExternalStore } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { themeConfigStore } from '@/hooks/useThemeConfig';

export function useColorScheme() {
  const systemScheme = useSystemColorScheme();
  const config = useSyncExternalStore(
    themeConfigStore.subscribe,
    themeConfigStore.getSnapshot,
    themeConfigStore.getSnapshot,
  );

  if (config.colorMode === 'light' || config.colorMode === 'dark') {
    return config.colorMode;
  }

  return systemScheme;
}
