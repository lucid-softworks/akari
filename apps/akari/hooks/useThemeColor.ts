import { useSyncExternalStore } from 'react';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { themeConfigStore } from '@/hooks/useThemeConfig';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const config = useSyncExternalStore(
    themeConfigStore.subscribe,
    themeConfigStore.getSnapshot,
    themeConfigStore.getSnapshot,
  );

  // 1. Accent color (highest priority for tint/tabIconSelected)
  if (config.accentColor && (colorName === 'tint' || colorName === 'tabIconSelected')) {
    return config.accentColor;
  }

  // 2. User's per-mode override
  const modeOverride = config[theme]?.[colorName];
  if (modeOverride) return modeOverride;

  // 3. Inline prop overrides
  const colorFromProps = props[theme];
  if (colorFromProps) return colorFromProps;

  // 4. Default
  return Colors[theme][colorName];
}
