import { NativeModules, Platform } from 'react-native';

import type { LogoVariant } from '@/hooks/useLogoSetting';

/**
 * Bridge surface exposed by the native AppLogoIconBridge module
 * (iOS: AppLogoIconBridge.m; Android: AppLogoIconModule.kt). Both
 * platforms back a promise-based API.
 */
type NativeBridge = {
  setAlternateIconName: (name: string | null) => Promise<boolean>;
  getCurrentAlternateIconName: () => Promise<string | null>;
  supportsAlternateIcons: () => Promise<boolean>;
};

function getBridge(): NativeBridge | null {
  if (Platform.OS === 'web') return null;
  const native = (NativeModules as Record<string, unknown>).AppLogoIconBridge;
  if (!native) {
    // Either we're running in Expo Go (no custom native), the user
    // hasn't rebuilt the dev client since the plugin landed, OR the
    // module is compiled in but not surfaced through NativeModules
    // (a known new-arch bridgeless gotcha for `RCT_EXPORT_MODULE`
    // classes that haven't been wired into the interop module list).
    console.warn(
      '[applyHomescreenIcon] NativeModules.AppLogoIconBridge is undefined — homescreen icon swap will no-op',
    );
    return null;
  }
  return native as NativeBridge;
}

/**
 * Switches the home-screen app icon to match the user's selected
 * logo variant. No-op on web (no homescreen) and a soft no-op on
 * native if the native module isn't linked yet.
 *
 * The promise resolves once the platform reports the change is
 * applied. iOS may show its system "App Icon Changed" alert. Android
 * uses activity-alias toggling under the hood — the home-screen
 * shortcut may briefly disappear and reappear on the user's launcher.
 */
export async function applyHomescreenIcon(variant: LogoVariant): Promise<void> {
  const bridge = getBridge();
  if (!bridge) return;
  try {
    console.log('[applyHomescreenIcon] calling native bridge', { variant });
    const target = variant === 'default' ? null : variant;
    const result = await bridge.setAlternateIconName(target);
    console.log('[applyHomescreenIcon] native bridge resolved', { variant, result });
  } catch (error) {
    // The most common failure mode is the user backgrounding the app
    // mid-switch on iOS — non-fatal; the JS-side setting still
    // persisted via MMKV and the icon will sync on the next attempt.
    console.warn('[applyHomescreenIcon] failed', error);
  }
}

/**
 * Reports whether the running platform/build can actually swap icons.
 * Used by Settings → Appearance to hide the variant picker on
 * web (no homescreen) or unstable Expo Go contexts.
 */
export async function supportsHomescreenIconSwap(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const bridge = getBridge();
  if (!bridge) return false;
  try {
    return await bridge.supportsAlternateIcons();
  } catch {
    return false;
  }
}
