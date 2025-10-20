import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';

export function ActivityChartSkeleton() {
  const borderColor = useBorderColor();
  const skeletonColor = useThemeColor({ light: '#E0E0E0', dark: '#404040' }, 'text');

  return (
    <ThemedView style={[styles.chartContainer, { borderColor }]}>
      <ThemedView style={[styles.header, { borderBottomColor: borderColor }]}>
        <View style={[styles.titleSkeleton, { backgroundColor: skeletonColor }]} />
        <View style={[styles.dropdownSkeleton, { backgroundColor: skeletonColor }]} />
      </ThemedView>

      <ThemedView style={styles.chartArea}>
        <View style={[styles.chartSkeleton, { backgroundColor: skeletonColor }]} />
      </ThemedView>

      <ThemedView style={[styles.statsContainer, { borderTopColor: borderColor }]}>
        <View style={[styles.statSkeleton, { borderRightColor: borderColor }]} />
        <View style={[styles.statSkeleton, { borderRightColor: borderColor }]} />
        <View style={styles.statSkeleton} />
      </ThemedView>
    </ThemedView>
  );
}

export function BiggestFansSkeleton() {
  const borderColor = useBorderColor();
  const skeletonColor = useThemeColor({ light: '#E0E0E0', dark: '#404040' }, 'text');

  return (
    <ThemedView style={[styles.container, { borderColor }]}>
      <View style={[styles.titleSkeleton, { backgroundColor: skeletonColor }]} />
      <View style={styles.fansContainer}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.fanSkeleton}>
            <View style={[styles.avatarSkeleton, { backgroundColor: skeletonColor }]} />
            <View style={[styles.handleSkeleton, { backgroundColor: skeletonColor }]} />
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

export function TopPostSkeleton() {
  const borderColor = useBorderColor();
  const skeletonColor = useThemeColor({ light: '#E0E0E0', dark: '#404040' }, 'text');

  return (
    <ThemedView style={[styles.container, { borderColor }]}>
      <View style={styles.header}>
        <View style={[styles.titleSkeleton, { backgroundColor: skeletonColor }]} />
        <View style={[styles.notesSkeleton, { backgroundColor: skeletonColor }]} />
      </View>
      <View style={[styles.imageSkeleton, { backgroundColor: skeletonColor }]} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Chart skeleton styles - match ActivityChart exactly
  chartContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 42, // paddingVertical (24) + text height (~18)
  },
  titleSkeleton: {
    height: 18,
    width: 80,
    borderRadius: 4,
  },
  dropdownSkeleton: {
    height: 24,
    width: 100,
    borderRadius: 6,
  },
  chartArea: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 232, // CHART_HEIGHT (200) + padding (32)
  },
  chartSkeleton: {
    width: '100%',
    height: 200, // CHART_HEIGHT
    borderRadius: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 68, // paddingVertical (32) + text heights (~36)
  },
  statSkeleton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
  },

  // Biggest Fans skeleton styles - match BiggestFans exactly
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  fansContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fanSkeleton: {
    alignItems: 'center',
    flex: 1,
  },
  avatarSkeleton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginBottom: 8,
  },
  handleSkeleton: {
    height: 12,
    width: 40,
    borderRadius: 4,
  },

  // Top Post skeleton styles - match TopPost exactly
  notesSkeleton: {
    height: 12,
    width: 60,
    borderRadius: 4,
  },
  imageSkeleton: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 80,
    borderRadius: 8,
  },
});
