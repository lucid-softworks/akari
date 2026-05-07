import { Platform } from 'react-native';

/**
 * Drop a couple of specific React Native warnings that fire repeatedly on web
 * but are cosmetic only:
 *
 * - `Animated: useNativeDriver is not supported` — RN warns once for every
 *   Animated invocation that opts into the native driver, even when the call
 *   site is *inside a third-party library* (FlashList's recyclerlistview
 *   uses `Animated.event` with `useNativeDriver: true` for its scroll
 *   handler). Web has no native animated module so it always falls back to
 *   the JS-based path; the warning is pure noise we can't silence at the
 *   call site.
 *
 * Only patched on web so native-side warnings stay visible. Only patches
 * `console.warn` (not `error`) so any new red box still appears.
 */
if (Platform.OS === 'web') {
  const SILENCED_WARNINGS = [
    'Animated: `useNativeDriver`',
  ] as const;
  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === 'string' && SILENCED_WARNINGS.some((s) => first.includes(s))) {
      return;
    }
    originalWarn(...args);
  };
}

export {};
