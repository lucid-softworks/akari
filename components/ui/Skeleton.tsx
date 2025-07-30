import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type SkeletonProps = ViewProps & {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  lightColor?: string;
  darkColor?: string;
};

export function Skeleton({
  style,
  width = '100%',
  height = 20,
  borderRadius = 4,
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
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
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
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
          opacity,
        },
        style,
      ]}
      {...otherProps}
    />
  );
} 