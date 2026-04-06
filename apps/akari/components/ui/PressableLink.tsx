import { Link, router } from 'expo-router';
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
    if (Platform.OS === 'web') {
      // Use router.push with the href directly on web
      // to ensure proper browser history integration
      router.push(href as any);
    } else if (onPress) {
      onPress();
    } else {
      router.push(href as any);
    }
  }, [href, onPress]);

  if (Platform.OS === 'web') {
    const resolved = typeof style === 'function'
      ? style({ pressed: false })
      : style;
    const flatStyle = { ...StyleSheet.flatten(resolved), textDecorationLine: 'none' as const };

    return (
      <Link
        href={href as any}
        asChild
        onPress={(e) => {
          // Prevent Link's default navigation to avoid ?handle= params
          // Allow cmd+click / ctrl+click for new tab
          const nativeEvent = (e as any).nativeEvent ?? e;
          if (nativeEvent?.metaKey || nativeEvent?.ctrlKey) return;
          e.preventDefault();
          handlePress();
        }}
      >
        <Pressable
          style={flatStyle}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole={accessibilityRole ?? 'link'}
          accessibilityState={accessibilityState}
        >
          {children}
        </Pressable>
      </Link>
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
