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

  // 1. Inline prop overrides (highest priority)
  const colorFromProps = props[theme];
  if (colorFromProps) return colorFromProps;

  // 2. User's per-mode override
  const modeOverride = config[theme]?.[colorName];
  if (modeOverride) return modeOverride;

  // 3. Accent color (applies to tint + tabIconSelected)
  if (config.accentColor && (colorName === 'tint' || colorName === 'tabIconSelected')) {
    return config.accentColor;
  }

  // 4. Default
  return Colors[theme][colorName];
}
