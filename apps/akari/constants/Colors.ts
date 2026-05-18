/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#5c8aff';

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#4B5563',
    textTertiary: '#9CA3AF',
    background: '#fff',
    panel: '#F7F9FB',
    tint: tintColorLight,
    accentDim: '#E5EBFF',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    border: '#E1E3E5',
    lineSoft: '#EEF0F2',
    hover: '#F3F4F6',
  },
  dark: {
    text: '#eceef1',
    textSecondary: '#9a9ca3',
    textTertiary: '#6b6d74',
    background: '#0b0c0e',
    panel: '#0e0f12',
    tint: tintColorDark,
    accentDim: '#1a2236',
    icon: '#9a9ca3',
    tabIconDefault: '#9a9ca3',
    tabIconSelected: tintColorDark,
    border: '#1b1c20',
    lineSoft: '#161719',
    hover: '#15161a',
  },
  /**
   * "Dim" variant of dark mode — lighter, less stark backgrounds for
   * users who find pure-black hard on the eyes. Selected via the
   * Dark theme picker on Settings → Appearance when colorMode is dark.
   */
  dim: {
    text: '#E6E8EA',
    textSecondary: '#9BA1A6',
    textTertiary: '#6B7280',
    background: '#1B2026',
    panel: '#1F252C',
    tint: tintColorDark,
    accentDim: '#2A3045',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    border: '#323840',
    lineSoft: '#2A3038',
    hover: '#252B33',
  },
};
