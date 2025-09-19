import { useAppTheme } from '@/theme';

type BorderVariant = 'default' | 'muted';

/**
 * Hook for getting the adaptive border color used throughout the app
 * @returns The border color that adapts to light/dark mode
 */
export function useBorderColor(variant: BorderVariant = 'default') {
  const { colors } = useAppTheme();
  return variant === 'muted' ? colors.borderMuted : colors.border;
}
