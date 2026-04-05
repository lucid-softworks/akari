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

/**
 * On web, renders as a Pressable inside a Link for proper <a> tag behavior
 * (hover preview, cmd+click, right-click menu) while keeping Pressable
 * layout. On native, renders as a plain Pressable.
 *
 * Uses router.push on click to avoid expo-router adding query params
 * for dynamic segments, while still rendering a proper <a> tag.
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
  const flatStyle = typeof style === 'function'
    ? style({ pressed: false })
    : StyleSheet.flatten(style);

  const handleWebPress = useCallback((e: any) => {
    // Let cmd+click / ctrl+click open in new tab naturally
    if (e?.metaKey || e?.ctrlKey) return;
    e?.preventDefault?.();
    if (onPress) {
      onPress();
    } else {
      router.push(href as any);
    }
  }, [href, onPress]);

  if (Platform.OS === 'web') {
    return (
      <Link
        href={href as any}
        onPress={handleWebPress}
        style={[flatStyle, { textDecorationLine: 'none' }] as any}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole ?? 'link'}
      >
        {children}
      </Link>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
    >
      {children}
    </Pressable>
  );
}
