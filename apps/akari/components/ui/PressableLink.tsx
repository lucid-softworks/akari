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
  const handleNativePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      router.push(href as any);
    }
  }, [href, onPress]);

  if (Platform.OS === 'web') {
    const handleClick = useCallback((e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
      router.push(href as any);
    }, [href]);

    // Use display:contents on the <a> so it doesn't affect layout.
    // The Pressable inside handles all RN styling.
    return (
      <a
        href={href}
        onClick={handleClick as any}
        style={{ display: 'contents', textDecoration: 'none', color: 'inherit' }}
        aria-label={accessibilityLabel}
      >
        <Pressable
          style={style}
          accessibilityRole={accessibilityRole ?? 'link'}
          accessibilityState={accessibilityState}
        >
          {children}
        </Pressable>
      </a>
    );
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
