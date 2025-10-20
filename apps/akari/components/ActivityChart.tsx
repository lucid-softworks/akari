import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Circle, Defs, LinearGradient, Path, Stop, Svg } from 'react-native-svg';

import { ChartTooltip } from '@/components/ChartTooltip';
import { FollowersTooltip } from '@/components/FollowersTooltip';
import { NotesTooltip } from '@/components/NotesTooltip';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TimeframeDropdown } from '@/components/TimeframeDropdown';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useProfile } from '@/hooks/queries/useProfile';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

import type { ActivityChartData, ActivityStats, Timeframe } from '@/hooks/queries/useActivityChart';

type ActivityChartProps = {
  chartData: ActivityChartData[];
  stats: ActivityStats;
  isLoading?: boolean;
  timeframe?: Timeframe;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  onPostPress?: (uri: string) => void;
  activeMetric?: 'notes' | 'followers';
  onMetricChange?: (metric: 'notes' | 'followers') => void;
};

const CHART_HEIGHT = 200;
const CHART_PADDING = 20;

export function ActivityChart({
  chartData,
  stats,
  isLoading,
  timeframe = '3d',
  onTimeframeChange,
  onPostPress,
  activeMetric = 'notes',
  onMetricChange,
}: ActivityChartProps) {
  const { t } = useTranslation();
  const borderColor = useBorderColor();
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  // Get current account and profile data for total followers
  const { data: currentAccount } = useCurrentAccount();
  const { data: profile } = useProfile(currentAccount?.handle || currentAccount?.did);

  const chartContainerRef = useRef<View>(null);
  const svgRef = useRef<View>(null);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    value: number;
    timestamp: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    value: 0,
    timestamp: '',
  });

  const [hideTimeout, setHideTimeout] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [hideTimeout]);

  // Add global mouse event listener to close tooltip when cursor moves outside
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (!tooltip.visible) return;

      const mouseX = event.clientX;
      const mouseY = event.clientY;

      // Check if mouse is outside tooltip area (approximate bounds)
      const tooltipWidth = 200;
      const tooltipHeight = 100;
      const isOutsideTooltip =
        mouseX < tooltip.x || mouseX > tooltip.x + tooltipWidth || mouseY < tooltip.y || mouseY > tooltip.y + tooltipHeight;

      // If mouse is outside tooltip, start hide timeout
      if (isOutsideTooltip && !isHovering) {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
        }
        const timeout = setTimeout(() => {
          setTooltip((prev) => ({ ...prev, visible: false }));
          setIsHovering(false);
        }, 1000); // 1 second delay
        setHideTimeout(timeout);
      }
    };

    if (tooltip.visible) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [tooltip.visible, tooltip.x, tooltip.y, hideTimeout, isHovering]);

  const showTooltip = (point: { x: number; y: number; value: number; timestamp: string }) => {
    // Clear any pending hide timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }

    setIsHovering(true);

    // First measure the chart container for width
    chartContainerRef.current?.measure((containerX, containerY, containerWidth) => {
      // Then measure the SVG for positioning
      svgRef.current?.measure((x: number, y: number, width: number, height: number) => {
        const tooltipHeight = 100;
        const tooltipWidth = 226;
        const tooltipOffset = 20;

        // Check if tooltip would overflow the container width
        const tooltipEndX = point.x + tooltipOffset + tooltipWidth;
        const wouldOverflowRight = tooltipEndX > containerWidth;

        // Calculate tooltip position based on overflow
        const leftPosition = x + point.x - tooltipOffset - tooltipWidth;
        const rightPosition = x + point.x + tooltipOffset;
        const tooltipX = wouldOverflowRight ? leftPosition : rightPosition;

        // Check if the tooltip would overflow the top of the container
        const tooltipEndY = y + point.y + tooltipHeight;
        const wouldOverflowTop = tooltipEndY > CHART_HEIGHT;

        // Calculate tooltip position based on overflow
        const topPosition = y + point.y - tooltipHeight;
        const tooltipY = wouldOverflowTop ? topPosition : 20;

        setTooltip({ visible: true, x: tooltipX, y: tooltipY, value: point.value, timestamp: point.timestamp });
      });
    });
  };

  const hideTooltip = () => {
    setIsHovering(false);
    // Add a delay before hiding to allow moving to tooltip
    const timeout = setTimeout(() => {
      if (!isHovering) {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    }, 300); // Short delay when leaving chart points
    setHideTimeout(timeout);
  };

  const cancelHideTooltip = () => {
    // Cancel the hide timeout if mouse enters tooltip
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }
    setIsHovering(true);
  };

  // Mock top posts data for tooltip
  const mockTopPosts = [
    { uri: 'at://did:plc:example/post/1', image: '', notes: 15, content: 'Amazing sunset today! 🌅' },
    { uri: 'at://did:plc:example/post/2', image: '', notes: 12, content: 'Just finished reading this book...' },
    { uri: 'at://did:plc:example/post/3', image: '', notes: 8, content: 'Coffee break thoughts ☕' },
  ];

  const { width } = Dimensions.get('window');
  const chartWidth = width - CHART_PADDING * 2;
  const chartInnerWidth = chartWidth - CHART_PADDING * 2;

  const { points, segments, zeroY } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { points: [], segments: [], zeroY: CHART_HEIGHT - CHART_PADDING };
    }

    const values = chartData.map((d) => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    // Calculate the zero line position
    const zeroY =
      min < 0
        ? CHART_HEIGHT - CHART_PADDING - ((0 - min) / range) * (CHART_HEIGHT - CHART_PADDING * 2)
        : CHART_HEIGHT - CHART_PADDING;

    const stepX = chartInnerWidth / (chartData.length - 1);
    const points = chartData.map((data, index) => {
      const x = CHART_PADDING + index * stepX;
      const y = CHART_HEIGHT - CHART_PADDING - ((data.value - min) / range) * (CHART_HEIGHT - CHART_PADDING * 2);
      const point = { x, y, value: data.value, timestamp: data.timestamp, isPositive: data.value >= 0 };
      return point;
    });

    // Create path segments with different colors based on actual data value
    const segments: { path: string; color: string; gradientColor: string }[] = [];

    // Group consecutive points with the same color
    const colorGroups: { startIndex: number; endIndex: number; color: string }[] = [];
    let currentGroupStart = 0;
    let currentGroupColor = chartData[0]?.value >= 0 ? '#34C759' : '#FF3B30';

    for (let i = 1; i < chartData.length; i++) {
      const dataColor = chartData[i].value >= 0 ? '#34C759' : '#FF3B30';

      if (dataColor !== currentGroupColor) {
        // Color changed, finish current group and start new one
        colorGroups.push({
          startIndex: currentGroupStart,
          endIndex: i - 1,
          color: currentGroupColor,
        });
        currentGroupStart = i;
        currentGroupColor = dataColor;
      }
    }

    // Add the last group
    colorGroups.push({
      startIndex: currentGroupStart,
      endIndex: chartData.length - 1,
      color: currentGroupColor,
    });

    // Create path segments for each color group
    colorGroups.forEach((group) => {
      if (group.startIndex === group.endIndex) {
        // Single point - create a small line segment
        const point = points[group.startIndex];
        const path = `M ${point.x - 1} ${point.y} L ${point.x + 1} ${point.y}`;
        segments.push({ path, color: group.color, gradientColor: group.color });
      } else {
        // Multiple points - create connected line segment
        let path = `M ${points[group.startIndex].x} ${points[group.startIndex].y}`;
        for (let i = group.startIndex + 1; i <= group.endIndex; i++) {
          path += ` L ${points[i].x} ${points[i].y}`;
        }
        segments.push({ path, color: group.color, gradientColor: group.color });
      }
    });

    // Add connecting lines between segments to ensure continuity
    for (let i = 0; i < colorGroups.length - 1; i++) {
      const currentGroup = colorGroups[i];
      const nextGroup = colorGroups[i + 1];

      // Connect the end of current group to start of next group
      const endPoint = points[currentGroup.endIndex];
      const startPoint = points[nextGroup.startIndex];

      // Create a connecting line segment with the color of the next group
      const connectingPath = `M ${endPoint.x} ${endPoint.y} L ${startPoint.x} ${startPoint.y}`;
      segments.push({
        path: connectingPath,
        color: nextGroup.color,
        gradientColor: nextGroup.color,
      });
    }

    return { points, segments, zeroY };
  }, [chartData, chartInnerWidth]);

  const formatNumber = (num: number | string) => {
    if (typeof num === 'string') {
      return num;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { borderColor }]}>
        <ThemedView style={styles.header}>
          <ThemedText style={styles.title}>{t('activity.title')}</ThemedText>
          <ThemedText style={styles.title}>{t('activity.lastDay')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.chartContainer}>
          <ThemedText style={styles.loadingText}>{t('activity.loadingChart')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.statsContainer}>
          <ThemedView style={[styles.statItem, { borderColor }]}>
            <ThemedText style={styles.loadingText}>-</ThemedText>
            <ThemedText style={styles.statLabel}>{t('activity.notes')}</ThemedText>
          </ThemedView>
          <ThemedView style={[styles.statItem, { borderColor }]}>
            <ThemedText style={styles.loadingText}>-</ThemedText>
            <ThemedText style={styles.statLabel}>{t('activity.newFollowers')}</ThemedText>
          </ThemedView>
          <ThemedView style={[styles.statItem, { borderColor }]}>
            <ThemedText style={styles.loadingText}>-</ThemedText>
            <ThemedText style={styles.statLabel}>{t('activity.totalFollowers')}</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <>
      {/* Tooltip - outside container to prevent clipping */}
      <ChartTooltip
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
        onMouseEnter={cancelHideTooltip}
        onMouseLeave={hideTooltip}
      >
        {activeMetric === 'notes' ? (
          <NotesTooltip
            value={tooltip.value}
            timestamp={tooltip.timestamp}
            topPosts={mockTopPosts}
            onPostPress={onPostPress}
          />
        ) : (
          <FollowersTooltip value={tooltip.value} timestamp={tooltip.timestamp} />
        )}
      </ChartTooltip>
      <ThemedView style={[styles.container, { borderColor }]}>
        <ThemedView style={styles.header}>
          <ThemedText style={styles.title}>{t('activity.title')}</ThemedText>
          <TimeframeDropdown selectedTimeframe={timeframe} onTimeframeChange={onTimeframeChange || (() => {})} />
        </ThemedView>

        <ThemedView style={styles.chartContainer} ref={chartContainerRef}>
          {/* No data case */}
          {chartData.length === 0 ? (
            <View style={styles.noDataContainer}>
              <ThemedText style={styles.noDataText}>{t('activity.noData')}</ThemedText>
            </View>
          ) : (
            <>
              {/* Y-axis background */}
              <ThemedView style={[styles.yAxisBackground, { backgroundColor: backgroundColor }]} />

              {/* Y-axis labels - positioned outside SVG */}
              <View style={styles.yAxisLabels}>
                {(() => {
                  const values = chartData.map((d) => d.value);
                  const max = Math.max(...values);
                  const min = Math.min(...values);
                  const range = max - min || 1;

                  // Calculate interval for Y-axis labels
                  const interval = Math.max(5, Math.ceil(range / 4 / 5) * 5); // Round to nearest 5
                  const labels = [];

                  // Add zero line if data spans negative values
                  if (min < 0) {
                    labels.push({ value: 0, y: zeroY });
                  }

                  // Add positive intervals
                  for (let val = interval; val <= max; val += interval) {
                    const y = CHART_HEIGHT - CHART_PADDING - ((val - min) / range) * (CHART_HEIGHT - CHART_PADDING * 2);
                    labels.push({ value: val, y });
                  }

                  // Add negative intervals
                  for (let val = -interval; val >= min; val -= interval) {
                    const y = CHART_HEIGHT - CHART_PADDING - ((val - min) / range) * (CHART_HEIGHT - CHART_PADDING * 2);
                    labels.push({ value: val, y });
                  }

                  return labels.map((label, index) => (
                    <ThemedText key={index} style={[styles.yAxisLabel, { top: label.y - 8 }]}>
                      {formatNumber(label.value)}
                    </ThemedText>
                  ));
                })()}
              </View>

              <View style={{ overflow: 'hidden' }} ref={svgRef}>
                <Svg width={chartWidth} height={CHART_HEIGHT}>
                  <Defs>
                    {/* Green gradient for positive values */}
                    <LinearGradient id="gradient-green" x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor="#34C759" stopOpacity="0.6" />
                      <Stop offset="100%" stopColor="#34C759" stopOpacity="0.2" />
                    </LinearGradient>
                    {/* Red gradient for negative values */}
                    <LinearGradient id="gradient-red" x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor="#FF3B30" stopOpacity="0.5" />
                      <Stop offset="100%" stopColor="#FF3B30" stopOpacity="0.15" />
                    </LinearGradient>

                    {/* Clip paths for positive and negative regions */}
                    <clipPath id="clip-positive">
                      <rect
                        x={CHART_PADDING}
                        y={CHART_PADDING}
                        width={chartWidth - CHART_PADDING * 2}
                        height={zeroY - CHART_PADDING}
                      />
                    </clipPath>
                    <clipPath id="clip-negative">
                      <rect
                        x={CHART_PADDING}
                        y={zeroY}
                        width={chartWidth - CHART_PADDING * 2}
                        height={CHART_HEIGHT - CHART_PADDING - zeroY}
                      />
                    </clipPath>
                  </Defs>

                  {/* Y-axis grid lines and zero line */}
                  {(() => {
                    const values = chartData.map((d) => d.value);
                    const max = Math.max(...values);
                    const min = Math.min(...values);
                    const range = max - min || 1;

                    // Calculate interval for grid lines
                    const interval = Math.max(5, Math.ceil(range / 4 / 5) * 5);
                    const lines = [];

                    // Add zero line if data spans negative values
                    if (min < 0) {
                      lines.push({ y: zeroY, isZero: true });
                    }

                    // Add positive intervals
                    for (let val = interval; val <= max; val += interval) {
                      const y = CHART_HEIGHT - CHART_PADDING - ((val - min) / range) * (CHART_HEIGHT - CHART_PADDING * 2);
                      lines.push({ y, isZero: false });
                    }

                    // Add negative intervals
                    for (let val = -interval; val >= min; val -= interval) {
                      const y = CHART_HEIGHT - CHART_PADDING - ((val - min) / range) * (CHART_HEIGHT - CHART_PADDING * 2);
                      lines.push({ y, isZero: false });
                    }

                    return lines.map((line, index) => (
                      <Path
                        key={`y-${index}`}
                        d={`M ${CHART_PADDING} ${line.y} L ${chartWidth - CHART_PADDING} ${line.y}`}
                        stroke={borderColor}
                        strokeWidth={line.isZero ? 1 : 0.5}
                        strokeDasharray={line.isZero ? '4,4' : '2,2'}
                        opacity={line.isZero ? 0.8 : 0.3}
                      />
                    ));
                  })()}

                  {/* X-axis grid lines for each data point */}
                  {points.map((point, index) => (
                    <Path
                      key={`x-${index}`}
                      d={`M ${point.x} ${CHART_PADDING} L ${point.x} ${CHART_HEIGHT - CHART_PADDING}`}
                      stroke={borderColor}
                      strokeWidth={0.5}
                      strokeDasharray="2,2"
                      opacity={0.2}
                    />
                  ))}

                  {/* Area fills with proper clipping */}
                  {(() => {
                    const areaFills = [];

                    // Create area fill that follows the exact line path
                    let areaPath = `M ${points[0].x} ${zeroY}`;

                    // Add all data points
                    points.forEach((point) => {
                      areaPath += ` L ${point.x} ${point.y}`;
                    });

                    // Close the path back to zero line
                    areaPath += ` L ${points[points.length - 1].x} ${zeroY} Z`;

                    // Create green area fill clipped to positive region
                    areaFills.push(
                      <Path
                        key="positive-area"
                        d={areaPath}
                        fill="url(#gradient-green)"
                        opacity={0.5}
                        clipPath="url(#clip-positive)"
                      />,
                    );

                    // Create red area fill clipped to negative region
                    areaFills.push(
                      <Path
                        key="negative-area"
                        d={areaPath}
                        fill="url(#gradient-red)"
                        opacity={0.5}
                        clipPath="url(#clip-negative)"
                      />,
                    );

                    return areaFills;
                  })()}

                  {/* Line segments with different colors */}
                  {segments.map((segment, index) => (
                    <Path key={`line-${index}`} d={segment.path} stroke={segment.color} strokeWidth={2} fill="none" />
                  ))}

                  {/* Data points with appropriate colors */}
                  {points.map((point, index) => (
                    <Circle key={index} cx={point.x} cy={point.y} r={5} fill={point.isPositive ? '#34C759' : '#FF3B30'} />
                  ))}

                  {/* Hover areas as SVG circles */}
                  {points.map((point, index) => (
                    <Circle
                      key={`hover-${index}`}
                      cx={point.x}
                      cy={point.y}
                      r={20}
                      fill="rgba(0, 0, 0, 0)"
                      {...({
                        onMouseEnter: () => {
                          showTooltip(point);
                        },
                        onMouseLeave: () => {
                          hideTooltip();
                        },
                      } as any)}
                    />
                  ))}
                </Svg>
              </View>

              {/* X-axis labels - positioned outside SVG */}
              <View style={styles.xAxisLabels}>
                {chartData.map((data, index) => {
                  const pointX = points[index]?.x;

                  // Only show labels for points in the center area
                  if (!pointX || pointX < 50 || pointX > chartInnerWidth - 120) {
                    return null;
                  }

                  // Show every 2nd point to provide better time context, but always show the last point
                  if (index % 2 !== 0 && index !== chartData.length - 1) {
                    return null;
                  }

                  const date = new Date(data.timestamp);
                  const timeLabel =
                    timeframe === '1d'
                      ? date.toLocaleString('en-US', { hour: 'numeric' })
                      : date.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                        });
                  return (
                    <ThemedText key={index} style={[styles.axisLabel, { left: pointX - 35 }]}>
                      {timeLabel}
                    </ThemedText>
                  );
                })}
              </View>
            </>
          )}
        </ThemedView>

        <ThemedView style={styles.statsContainer}>
          <TouchableOpacity
            style={[styles.statItem, { borderColor }, activeMetric === 'notes' && styles.activeStatItem]}
            onPress={() => onMetricChange?.('notes')}
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.statValue, { color: textColor }]}>{formatNumber(stats.notes)}</ThemedText>
            <ThemedText style={styles.statLabel}>{t('activity.notes')}</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statItem, { borderColor }, activeMetric === 'followers' && styles.activeStatItem]}
            onPress={() => onMetricChange?.('followers')}
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.statValue, { color: textColor }]}>{formatNumber(stats.newFollowers)}</ThemedText>
            <ThemedText style={styles.statLabel}>{t('activity.newFollowers')}</ThemedText>
          </TouchableOpacity>

          <ThemedView style={[styles.statItem, { borderColor }]}>
            <ThemedText style={[styles.statValue, { color: textColor }]}>
              {formatNumber(profile?.followersCount || 0)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>{t('activity.totalFollowers')}</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
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
    position: 'relative',
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  chartContainer: {
    paddingLeft: 50, // Space for Y-axis labels
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 50, // Space for X-axis labels
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: CHART_HEIGHT + 60,
    position: 'relative',
    zIndex: 1,
  },
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: CHART_HEIGHT,
  },
  noDataText: {
    fontSize: 16,
    opacity: 0.6,
    fontWeight: '500',
  },
  hoverPoint: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  statsContainer: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  activeStatItem: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 16,
    width: 45,
    height: CHART_HEIGHT,
    paddingRight: 5,
    zIndex: 11,
  },
  yAxisBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 50,
    height: CHART_HEIGHT,
    zIndex: 1,
  },
  xAxisLabels: {
    position: 'absolute',
    left: 50,
    top: CHART_HEIGHT + 16,
    right: 120,
    height: 30,
  },
  axisLabel: {
    position: 'absolute',
    fontSize: 10,
    opacity: 0.8,
    textAlign: 'center',
    fontWeight: '500',
    width: 70,
  },
  yAxisLabel: {
    position: 'absolute',
    fontSize: 10,
    opacity: 0.8,
    textAlign: 'right',
    fontWeight: '500',
    width: 50,
    right: 5,
  },
  xAxisTitle: {
    position: 'absolute',
    left: 70,
    right: 16,
    top: CHART_HEIGHT + 46,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
    textAlign: 'center',
  },
});
