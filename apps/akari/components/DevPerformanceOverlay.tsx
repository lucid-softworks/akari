import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { radius, spacing } from '@/constants/tokens';
import { useDevSettings } from '@/hooks/useDevSettings';

// Only render in dev mode
if (!__DEV__) {
  module.exports = { DevPerformanceOverlay: () => null };
}

type PerfStats = {
  fps: number;
  avgFrameTime: number;
  jsHeap: number | null;
  droppedFrames: number;
};

const SAMPLE_WINDOW = 60; // frames to average over

export function DevPerformanceOverlay() {
  const { fpsOverlayEnabled } = useDevSettings();
  const [visible, setVisible] = useState(true);
  const [stats, setStats] = useState<PerfStats>({ fps: 0, avgFrameTime: 0, jsHeap: null, droppedFrames: 0 });
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameRef = useRef<number>(0);
  const droppedRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const measureFrame = useCallback((timestamp: number) => {
    if (lastFrameRef.current > 0) {
      const delta = timestamp - lastFrameRef.current;
      frameTimesRef.current.push(delta);

      // Count dropped frames (>20ms = below 50fps)
      if (delta > 20) {
        droppedRef.current++;
      }

      if (frameTimesRef.current.length >= SAMPLE_WINDOW) {
        const times = frameTimesRef.current;
        const avgFrameTime = times.reduce((a, b) => a + b, 0) / times.length;
        const fps = Math.round(1000 / avgFrameTime);

        // Try to get JS heap size (available in some engines)
        let jsHeap: number | null = null;
        if (typeof performance !== 'undefined' && (performance as any).memory) {
          jsHeap = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
        }

        setStats({
          fps,
          avgFrameTime: Math.round(avgFrameTime * 10) / 10,
          jsHeap,
          droppedFrames: droppedRef.current,
        });

        frameTimesRef.current = [];
        droppedRef.current = 0;
      }
    }

    lastFrameRef.current = timestamp;
    rafRef.current = requestAnimationFrame(measureFrame);
  }, []);

  useEffect(() => {
    if (visible) {
      lastFrameRef.current = 0;
      frameTimesRef.current = [];
      droppedRef.current = 0;
      rafRef.current = requestAnimationFrame(measureFrame);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [visible, measureFrame]);

  if (!__DEV__ || !fpsOverlayEnabled) return null;

  if (!visible) {
    return (
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.toggleText}>FPS</Text>
      </TouchableOpacity>
    );
  }

  const fpsColor = stats.fps >= 55 ? '#4ade80' : stats.fps >= 30 ? '#fbbf24' : '#ef4444';

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <TouchableOpacity style={styles.panel} onPress={() => setVisible(false)} activeOpacity={0.9}>
        <View style={styles.row}>
          <Text style={[styles.value, { color: fpsColor }]}>{stats.fps}</Text>
          <Text style={styles.label}>FPS</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.value}>{stats.avgFrameTime}ms</Text>
          <Text style={styles.label}>Frame</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={[styles.value, stats.droppedFrames > 5 ? styles.valueWarn : null]}>
            {stats.droppedFrames}
          </Text>
          <Text style={styles.label}>Drops</Text>
        </View>
        {stats.jsHeap !== null && (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.value}>{stats.jsHeap}MB</Text>
              <Text style={styles.label}>Heap</Text>
            </View>
          </>
        )}
        <View style={styles.divider} />
        <Text style={styles.label}>{Platform.OS}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    position: 'absolute',
    top: 60,
    left: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
    zIndex: 9999,
  },
  toggleText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  overlay: {
    position: 'absolute',
    top: 60,
    left: spacing.sm,
    zIndex: 9999,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
    gap: spacing.sm,
  },
  row: {
    alignItems: 'center',
  },
  value: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  valueWarn: {
    color: '#fbbf24',
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
