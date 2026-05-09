import * as Application from 'expo-application';
import Constants from 'expo-constants';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WatermarkView } from 'expo-watermark';

/**
 * Stamps a build identifier (`v1.9.0 (build 42) · abc1234`) into screenshots
 * and screen recordings of the running app. The text is invisible during
 * normal use — `WatermarkView`'s children only appear in captured frames —
 * so when a TestFlight tester sends us a screenshot we can read off which
 * build they were on. We mount this only for non-development variants in
 * `app/_layout.tsx`.
 */
export function BuildWatermark({ children }: { children: React.ReactNode }) {
  const text = useMemo(() => formatBuildLabel(), []);

  return (
    <View style={styles.container}>
      {children}
      <WatermarkView pointerEvents="none" style={styles.watermark}>
        <Text style={styles.text}>{text}</Text>
      </WatermarkView>
    </View>
  );
}

function formatBuildLabel(): string {
  const version = Constants.expoConfig?.version ?? '?';
  const build = Application.nativeBuildVersion ?? '?';
  const extra = Constants.expoConfig?.extra as
    | { buildMetadata?: { commitSha?: string | null } }
    | undefined;
  const commitSha =
    typeof extra?.buildMetadata?.commitSha === 'string' && extra.buildMetadata.commitSha.length > 0
      ? extra.buildMetadata.commitSha.slice(0, 7)
      : null;
  return commitSha
    ? `v${version} (${build}) · ${commitSha}`
    : `v${version} (${build})`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Pinned to the bottom-right; the text is the only thing rendered in
  // screenshots so leaving it on top of the app is fine.
  watermark: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'SpaceMono',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 4,
    overflow: 'hidden',
  },
});
