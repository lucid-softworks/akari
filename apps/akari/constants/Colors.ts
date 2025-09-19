/**
 * Application color tokens for light and dark modes.
 * The values mirror the app theme so components using
 * `useThemeColor` and the raw `Colors` map stay in sync.
 */

import { themes } from '@/theme';

const light = themes.light.colors;
const dark = themes.dark.colors;

export const Colors = {
  light: {
    text: light.text,
    textSecondary: light.textSecondary,
    textMuted: light.textMuted,
    background: light.background,
    surface: light.surface,
    surfaceSecondary: light.surfaceSecondary,
    surfaceTertiary: light.surfaceTertiary,
    surfaceHover: light.surfaceHover,
    surfaceActive: light.surfaceActive,
    tint: light.accent,
    accent: light.accent,
    accentMuted: light.accentMuted,
    icon: light.textSecondary,
    tabIconDefault: light.textMuted,
    tabIconSelected: light.accent,
    border: light.border,
    borderMuted: light.borderMuted,
    badge: light.badge,
    badgeActive: light.badgeActive,
    overlay: light.overlay,
    overlayStrong: light.overlayStrong,
    inverseText: light.inverseText,
    success: light.success,
    warning: light.warning,
    danger: light.danger,
    info: light.info,
    shadow: light.shadow,
  },
  dark: {
    text: dark.text,
    textSecondary: dark.textSecondary,
    textMuted: dark.textMuted,
    background: dark.background,
    surface: dark.surface,
    surfaceSecondary: dark.surfaceSecondary,
    surfaceTertiary: dark.surfaceTertiary,
    surfaceHover: dark.surfaceHover,
    surfaceActive: dark.surfaceActive,
    tint: dark.accent,
    accent: dark.accent,
    accentMuted: dark.accentMuted,
    icon: dark.textSecondary,
    tabIconDefault: dark.textMuted,
    tabIconSelected: dark.accent,
    border: dark.border,
    borderMuted: dark.borderMuted,
    badge: dark.badge,
    badgeActive: dark.badgeActive,
    overlay: dark.overlay,
    overlayStrong: dark.overlayStrong,
    inverseText: dark.inverseText,
    success: dark.success,
    warning: dark.warning,
    danger: dark.danger,
    info: dark.info,
    shadow: dark.shadow,
  },
} as const;
