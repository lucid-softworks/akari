import { useThemeColor } from "@/hooks/useThemeColor";

/**
 * Hook for getting the adaptive border color used throughout the app
 * @returns The border color that adapts to light/dark mode
 */
export function useBorderColor() {
  return useThemeColor(
    {
      light: "#e8eaed",
      dark: "#2d3133",
    },
    "background"
  );
}
