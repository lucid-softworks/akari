import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';

export type AppThemeColors = {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  surfaceHover: string;
  surfaceActive: string;
  border: string;
  borderMuted: string;
  shadow: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentMuted: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  badge: string;
  badgeActive: string;
  inverseText: string;
  overlay: string;
  overlayStrong: string;
};

export type AppTheme = {
  colors: AppThemeColors;
};

const lightTheme: AppTheme = {
  colors: {
    background: '#F3F4F6',
    surface: '#FFFFFF',
    surfaceSecondary: '#F9FAFB',
    surfaceTertiary: '#EEF2FF',
    surfaceHover: '#F3F4F6',
    surfaceActive: '#EEF2FF',
    border: '#E5E7EB',
    borderMuted: '#E2E8F0',
    shadow: 'rgba(15, 23, 42, 0.12)',
    text: '#1F2937',
    textSecondary: '#4B5563',
    textMuted: '#6B7280',
    accent: '#7C8CF9',
    accentMuted: '#E0E7FF',
    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#0EA5E9',
    badge: '#EA580C',
    badgeActive: '#7C8CF9',
    inverseText: '#FFFFFF',
    overlay: 'rgba(15, 23, 42, 0.45)',
    overlayStrong: 'rgba(15, 23, 42, 0.6)',
  },
};

const darkTheme: AppTheme = {
  colors: {
    background: '#0F1115',
    surface: '#151823',
    surfaceSecondary: '#131722',
    surfaceTertiary: '#1E2537',
    surfaceHover: '#1A1D27',
    surfaceActive: '#1E2537',
    border: '#1F212D',
    borderMuted: '#25283A',
    shadow: 'rgba(2, 6, 23, 0.6)',
    text: '#F4F4F5',
    textSecondary: '#A1A1AA',
    textMuted: '#6B7280',
    accent: '#7C8CF9',
    accentMuted: '#2F365F',
    success: '#22C55E',
    warning: '#F97316',
    danger: '#F87171',
    info: '#38BDF8',
    badge: '#EA580C',
    badgeActive: '#7C8CF9',
    inverseText: '#FFFFFF',
    overlay: 'rgba(12, 18, 32, 0.65)',
    overlayStrong: 'rgba(2, 6, 23, 0.75)',
  },
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme() ?? 'light';

  return useMemo(() => (scheme === 'dark' ? darkTheme : lightTheme), [scheme]);
}

export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  stylesFactory: (theme: AppTheme) => T,
): T {
  const theme = useAppTheme();
  return useMemo(() => StyleSheet.create(stylesFactory(theme)), [stylesFactory, theme]);
}
