import { useEffect } from 'react';
import { Platform, type ImageStyle, type StyleProp } from 'react-native';

import { Image } from '@/components/Image';
import { useLogoVariant, type LogoVariant } from '@/hooks/useLogoSetting';

// Pre-required so Metro bundles both variants up front and switching
// the setting is a synchronous source swap rather than an async load.
const LOGO_ASSETS: Record<LogoVariant, number> = {
  default: require('@/assets/images/icon.png'),
  classic: require('@/assets/images/logo-classic.png'),
};

// Web-only: matching static paths served out of `public/` so we can
// point `<link rel="icon">` at them without needing the RN Image
// asset-resolution APIs (which aren't reliably available on
// react-native-web in some bundler setups).
const FAVICON_URLS: Record<LogoVariant, string> = {
  default: '/icon.png',
  classic: '/logo-classic.png',
};

type AppLogoProps = {
  style?: StyleProp<ImageStyle>;
  /**
   * Override the user setting and force a specific variant — useful for
   * preview tiles in the settings screen so we can show both options
   * side-by-side regardless of which one is currently active.
   */
  variant?: LogoVariant;
  /** Accessibility label override. Defaults to "akari logo". */
  accessibilityLabel?: string;
};

/**
 * The akari logo. Reads `useLogoVariant()` so the choice flips live
 * whenever the user toggles it in Settings → Appearance.
 */
export function AppLogo({ style, variant, accessibilityLabel = 'akari logo' }: AppLogoProps) {
  const current = useLogoVariant();
  const source = LOGO_ASSETS[variant ?? current];
  return (
    <Image
      source={source}
      style={style}
      accessibilityLabel={accessibilityLabel}
      contentFit="contain"
    />
  );
}

/**
 * Web-only: keeps `<link rel="icon">` in sync with the user's selected
 * logo variant. Call once near the app root. No-op on native (mobile
 * doesn't use favicons; the homescreen icon swap is handled separately
 * via `setAlternateAppIcon`).
 */
export function useFaviconSync() {
  const variant = useLogoVariant();
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;
    const href = FAVICON_URLS[variant];
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  }, [variant]);
}
