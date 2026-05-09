import { useSyncExternalStore } from 'react';

import { themeConfigStore } from '@/hooks/useThemeConfig';

const SCALE_BY_SIZE = {
  smaller: 0.875,
  default: 1,
  larger: 1.125,
} as const;

/**
 * Returns the multiplier the user picked on Settings → Appearance →
 * Font size. Components that render text via `ThemedText` get this
 * applied automatically; components that render plain `<Text>` can
 * call this directly to multiply their own `fontSize` style.
 */
export function useFontSizeScale(): number {
  const config = useSyncExternalStore(
    themeConfigStore.subscribe,
    themeConfigStore.getSnapshot,
    themeConfigStore.getSnapshot,
  );
  const size = config.fontSize ?? 'default';
  return SCALE_BY_SIZE[size];
}
