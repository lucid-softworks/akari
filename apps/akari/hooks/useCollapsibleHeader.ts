import { useCallback, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * State + handlers for a translation-based collapsible header overlay
 * that hides as the user scrolls down and snaps back at the top. The
 * caller owns the actual <Animated.View> wrapper, this hook just wires
 * up the shared values + layout/scroll callbacks.
 */
export function useCollapsibleHeader(defaultHeight: number) {
  const [headerHeight, setHeaderHeight] = useState(defaultHeight);
  const headerHeightSv = useSharedValue(defaultHeight);
  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);

  const handleHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const h = event.nativeEvent.layout.height;
      if (h > 0) {
        setHeaderHeight(h);
        headerHeightSv.value = h;
      }
    },
    [headerHeightSv],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const delta = y - lastScrollY.value;
      lastScrollY.value = y;
      if (y <= 0) {
        headerTranslateY.value = 0;
      } else {
        const max = headerHeightSv.value;
        const next = headerTranslateY.value - delta;
        headerTranslateY.value = Math.max(-max, Math.min(0, next));
      }
    },
    [headerHeightSv, headerTranslateY, lastScrollY],
  );

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const snapHeaderOpen = useCallback(() => {
    headerTranslateY.value = withTiming(0, { duration: 150 });
  }, [headerTranslateY]);

  return {
    headerHeight,
    headerAnimatedStyle,
    handleHeaderLayout,
    handleScroll,
    snapHeaderOpen,
  };
}
