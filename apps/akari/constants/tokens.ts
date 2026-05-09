/**
 * Design tokens for consistent styling across the app.
 *
 * Usage:
 *   import { spacing, radius, typography, shadows, opacity, hitSlop } from '@/constants/tokens';
 *
 *   style={{ padding: spacing.md, borderRadius: radius.md }}
 */

// ---------------------------------------------------------------------------
// Spacing (8px base grid)
// ---------------------------------------------------------------------------
export const spacing = {
  /** 2px - hairline gaps */
  xxs: 2,
  /** 4px - tight inner padding */
  xs: 4,
  /** 8px - compact spacing */
  sm: 8,
  /** 12px - default inner padding */
  md: 12,
  /** 16px - standard section padding */
  lg: 16,
  /** 20px - generous padding */
  xl: 20,
  /** 24px - section gaps */
  xxl: 24,
  /** 32px - large section separation */
  xxxl: 32,
  /** 40px - page-level padding */
  xxxxl: 40,
} as const;

// ---------------------------------------------------------------------------
// Border Radius
// ---------------------------------------------------------------------------
export const radius = {
  /** 0px - sharp corners */
  none: 0,
  /** 4px - subtle rounding (labels, badges) */
  xs: 4,
  /** 8px - cards, embeds, images */
  sm: 8,
  /** 12px - larger cards, modals */
  md: 12,
  /** 16px - buttons, prominent cards */
  lg: 16,
  /** 20px - pill-shaped buttons */
  xl: 20,
  /** 9999px - fully round (avatars, pills) */
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
export const fontSize = {
  /** 11px - fine print, badges */
  xs: 11,
  /** 12px - timestamps, captions */
  sm: 12,
  /** 13px - secondary labels */
  md: 13,
  /** 14px - body small, handles */
  base: 14,
  /** 16px - body, primary text */
  lg: 16,
  /** 17px - section headers */
  xl: 17,
  /** 20px - subtitles */
  xxl: 20,
  /** 24px - titles */
  xxxl: 24,
  /** 32px - large titles */
  display: 32,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const lineHeight = {
  tight: 16,
  normal: 20,
  relaxed: 24,
  loose: 28,
  display: 32,
} as const;

// ---------------------------------------------------------------------------
// Opacity (for secondary/tertiary text via opacity instead of color)
// ---------------------------------------------------------------------------
export const opacity = {
  /** Full visibility */
  primary: 1.0,
  /** Handles, secondary labels */
  secondary: 0.7,
  /** Timestamps, hints, placeholders */
  tertiary: 0.5,
  /** Disabled elements */
  disabled: 0.4,
  /** Overlay backdrops */
  overlay: 0.2,
} as const;

// ---------------------------------------------------------------------------
// Shadows / Elevation
// ---------------------------------------------------------------------------
export const shadows = {
  /** Subtle lift - dividers, cards */
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  /** Medium lift - dropdowns, popovers */
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  /** Prominent lift - FAB, modals */
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  /** Top bar shadow (upward direction) */
  top: {
    shadowColor: 'rgba(12, 14, 24, 0.28)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// ---------------------------------------------------------------------------
// Touch targets (Apple HIG minimum: 44pt)
// ---------------------------------------------------------------------------
export const touchTarget = {
  /** Minimum tappable size */
  min: 44,
  /** Standard button height */
  button: 48,
} as const;

/** Default hitSlop for small icons/buttons to expand tap area to 44pt */
export const hitSlop = {
  top: 8,
  right: 8,
  bottom: 8,
  left: 8,
} as const;

// ---------------------------------------------------------------------------
// Interactive feedback
// ---------------------------------------------------------------------------
export const activeOpacity = {
  /** Default press feedback */
  default: 0.7,
  /** Subtle press feedback (cards, large areas) */
  subtle: 0.8,
  /** Strong press feedback (icon buttons) */
  strong: 0.6,
} as const;

// ---------------------------------------------------------------------------
// Semantic colors (theme-independent constants)
// ---------------------------------------------------------------------------
export const semanticColors = {
  /** Destructive actions (delete, block, report) */
  danger: '#d13232',
  /** Like heart */
  like: '#ff3b30',
  /** Repost / boost */
  repost: '#34c759',
  /** Bookmark fill */
  bookmark: '#ff9500',
  /** Live streaming accent */
  live: '#ff274c',
  /** iOS system blue (use sparingly -- prefer theme accent) */
  systemBlue: '#007AFF',
} as const;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export const layout = {
  /** Standard avatar size in feed */
  avatarSmall: 32,
  /** Standard avatar size in posts */
  avatarMedium: 40,
  /** Large avatar (profile header) */
  avatarLarge: 80,
  /** Max content width for large screens */
  maxContentWidth: 1200,
  /** Bottom tab bar extra padding for scroll content */
  tabBarPadding: 100,
  /** Hairline border width */
  hairline: 0.5,
  /** Standard border width */
  border: 1,
} as const;
