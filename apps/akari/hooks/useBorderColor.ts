import { useThemeColor } from "@/hooks/useThemeColor";

/**
 * Hook for getting the adaptive border color used throughout the app.
 *
 * Previously this hook read the `background` token (with hardcoded
 * fallbacks), which meant any user-set background override on the
 * Appearance screen flowed straight into every border in the app —
 * picking a new dark background made all hairlines vanish because
 * they were tracking the bg colour. Now it reads the `border` token
 * proper, so the two stay independent.
 */
export function useBorderColor() {
  return useThemeColor({}, "border");
}
