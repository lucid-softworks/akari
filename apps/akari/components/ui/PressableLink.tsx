import { router } from 'expo-router';
import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

type PressableLinkProps = {
  href: string;
  onPress?: () => void;
  style?: PressableProps['style'];
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityState?: PressableProps['accessibilityState'];
};

export function PressableLink({
  href,
  onPress,
  style,
  children,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
}: PressableLinkProps) {
  const handleNativePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      router.push(href as any);
    }
  }, [href, onPress]);

  if (Platform.OS === 'web') {
    const resolved = typeof style === 'function'
      ? style({ pressed: false })
      : style;
    const flatStyle = {
      ...StyleSheet.flatten(resolved),
      textDecorationLine: 'none',
      color: 'inherit',
      display: 'flex',
      cursor: 'pointer',
    } as ViewStyle;

    return React.createElement('a', {
      href,
      onClick: (e: MouseEvent) => {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        e.stopPropagation();
        router.push(href as any);
      },
      style: flatStyle,
      'aria-label': accessibilityLabel,
      role: accessibilityRole ?? 'link',
      children,
    });
  }

  return (
    <Pressable
      onPress={handleNativePress}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
    >
      {children}
    </Pressable>
  );
}
