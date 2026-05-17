import { useEffect } from 'react';
import { View, type DimensionValue, type ViewProps } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radius } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';

export type SkeletonProps = ViewProps & {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  lightColor?: string;
  darkColor?: string;
};

export function Skeleton({
  style,
  width = '100%',
  height = 20,
  borderRadius = radius.xs,
  lightColor,
  darkColor,
  ...otherProps
}: SkeletonProps) {
  const progress = useSharedValue(0);
  const backgroundColor = useThemeColor(
    {
      light: lightColor || '#f0f0f0',
      dark: darkColor || '#2a2a2a',
    },
    'background',
  );

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.linear }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
      {...otherProps}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}
