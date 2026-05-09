import React from 'react';

/**
 * Web stub for `BuildWatermark`. The watermark is for native TestFlight /
 * Play Store screenshots — Leaflet's web export goes through expo-router's
 * static-render pass which evaluates `expo-watermark` at module-load time,
 * and that package only ships native modules for iOS/Android. Picking this
 * file on web (via Metro's `.web.tsx` resolution) skips the import entirely.
 */
export function BuildWatermark({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
