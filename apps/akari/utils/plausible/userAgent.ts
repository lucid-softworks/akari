import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type PlausibleAppProps = {
  app_platform: 'ios' | 'android' | 'web';
  app_version: string;
  app_variant: string;
};

export type AppPlatform = PlausibleAppProps['app_platform'];

function appVersion(): string {
  // expoConfig.version is the public version string (e.g. "1.9.0"); fall
  // back to the native build number if a variant config strips version.
  return (
    Constants.expoConfig?.version ??
    Application.nativeApplicationVersion ??
    '0.0.0'
  );
}

function appVariant(): string {
  const variant = Constants.expoConfig?.extra?.variant;
  return typeof variant === 'string' ? variant : 'unknown';
}

export function appPlatform(): AppPlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export function getAppProps(): PlausibleAppProps {
  return {
    app_platform: appPlatform(),
    app_version: appVersion(),
    app_variant: appVariant(),
  };
}

/**
 * Build a User-Agent identifying app traffic so Plausible can distinguish
 * native sessions from real browsers. Returns null on web — fetch forbids
 * setting `User-Agent` from JS in browsers, and the real browser UA is
 * what we want there anyway.
 *
 * Format intentionally puts `Akari/<ver>` first (no Mozilla/Safari/Chrome
 * tokens) so ua-parser tags the "browser" as Akari instead of bucketing
 * us under Mobile Safari / Chrome WebView. The bracketed OS tail uses
 * the canonical `iPhone OS X_Y_Z` / `Android X` patterns so OS detection
 * still works.
 */
export function buildUserAgent(): string | null {
  if (Platform.OS === 'web') return null;

  const version = appVersion();

  if (Platform.OS === 'ios') {
    const osVersion = (Device.osVersion ?? '0.0').replace(/\./g, '_');
    const model = Device.modelName ?? 'iPhone';
    const isPad = /ipad/i.test(model);
    const platformToken = isPad ? 'iPad' : 'iPhone';
    const osFamily = isPad ? 'OS' : 'iPhone OS';
    return `Akari/${version} (${platformToken}; CPU ${osFamily} ${osVersion} like Mac OS X)`;
  }

  if (Platform.OS === 'android') {
    const osVersion = Device.osVersion ?? '0';
    const model = Device.modelName ?? 'Android';
    return `Akari/${version} (Linux; Android ${osVersion}; ${model})`;
  }

  return `Akari/${version} (${Platform.OS})`;
}
