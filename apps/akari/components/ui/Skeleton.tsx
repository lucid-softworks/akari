import { useEffect, useRef } from 'react';
import { Animated, Platform, View, type DimensionValue, type ViewProps } from 'react-native';

// `useNativeDriver` is a no-op on web (no native animated module) and logs a
// warning whenever an animation tries to use it. Map to false on web; native
// keeps the UI-thread driver.
const NATIVE_DRIVER = Platform.OS !== 'web';

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
  const animatedValue = useRef(new Animated.Value(0)).current;
  const backgroundColor = useThemeColor(
    {
      light: lightColor || '#f0f0f0',
      dark: darkColor || '#2a2a2a',
    },
    'background',
  );

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

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
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor,
          opacity,
        }}
      />
    </View>
  );
}
