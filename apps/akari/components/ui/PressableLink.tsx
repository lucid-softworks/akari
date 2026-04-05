import { Link, router } from 'expo-router';
import React, { forwardRef, useCallback } from 'react';
import { Platform, Pressable, StyleSheet, type PressableProps, type View } from 'react-native';

type PressableLinkProps = {
  href: string;
  onPress?: () => void;
  style?: PressableProps['style'];
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityState?: PressableProps['accessibilityState'];
};

/**
 * On web, renders a Pressable wrapped in a Link (asChild) for proper
 * <a> tag behavior while keeping Pressable layout.
 * On native, renders a plain Pressable.
 */
export function PressableLink({
  href,
  onPress,
  style,
  children,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
}: PressableLinkProps) {
  const handlePress = useCallback((e?: any) => {
    // On web, prevent Link's default navigation and use router.push
    // to avoid expo-router adding query params for dynamic segments.
    // Allow cmd+click / ctrl+click to open in new tab.
    if (Platform.OS === 'web') {
      if (e?.metaKey || e?.ctrlKey) return;
      e?.preventDefault?.();
    }
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
    const flatStyle = { ...StyleSheet.flatten(resolved), textDecorationLine: 'none' as const };

    return (
      <Link href={href as any} asChild>
        <Pressable
          onPress={handlePress}
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
      onPress={onPress ?? (() => router.push(href as any))}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
    >
      {children}
    </Pressable>
  );
}
