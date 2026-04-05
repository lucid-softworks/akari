import { router } from 'expo-router';
import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, type PressableProps } from 'react-native';

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
  const handlePress = useCallback(() => {
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
    };

    const handleClick = (e: React.MouseEvent) => {
      // Allow cmd+click / ctrl+click to open in new tab
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      handlePress();
    };

    return (
      // @ts-expect-error - using <a> directly for proper web semantics
      <a
        href={href}
        onClick={handleClick}
        style={flatStyle}
        aria-label={accessibilityLabel}
        role={accessibilityRole ?? 'link'}
      >
        {children}
      </a>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
    >
      {children}
    </Pressable>
  );
}
